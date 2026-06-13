from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import quote

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
try:
    from mangum import Mangum
except Exception:  # Mangum is installed on Vercel through requirements.txt.
    Mangum = None
from pydantic import BaseModel, EmailStr, Field

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY", "")
USE_MOCK_DB = os.getenv("USE_MOCK_DB", "").lower() in {"1", "true", "yes"} or not (SUPABASE_URL and SUPABASE_KEY)
CORS_ORIGINS = [origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if origin.strip()]

app = FastAPI(title="SplitEats+ API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS or ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class AuthPayload(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class SplitPersonPayload(BaseModel):
    name: str
    amount: float
    paid: bool = False


class SplitItemPayload(BaseModel):
    item_name: str
    price: float
    assigned_to: Optional[str] = None


class SplitPayload(BaseModel):
    title: str
    total_amount: float
    mode: str
    people: List[SplitPersonPayload]
    items: List[SplitItemPayload]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(password: str, salt: Optional[str] = None) -> str:
    salt = salt or secrets.token_hex(16)
    iterations = 120_000
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return f"pbkdf2_sha256${iterations}${salt}${base64.b64encode(digest).decode('ascii')}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt, expected = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), int(iterations))
        return hmac.compare_digest(base64.b64encode(digest).decode("ascii"), expected)
    except Exception:
        return False


class MockStore:
    """Local fallback so the project can be tested without real Supabase credentials."""

    def __init__(self) -> None:
        self.path = Path(__file__).with_name("mock_data.json")
        if not self.path.exists():
            self.path.write_text(json.dumps({"users": [], "sessions": [], "splits": [], "people": [], "items": []}, indent=2))

    def _read(self) -> Dict[str, Any]:
        return json.loads(self.path.read_text())

    def _write(self, data: Dict[str, Any]) -> None:
        self.path.write_text(json.dumps(data, indent=2))

    def find_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        data = self._read()
        return next((user for user in data["users"] if user["email"].lower() == email.lower()), None)

    def create_user(self, email: str, password_hash: str) -> Dict[str, Any]:
        data = self._read()
        user = {"id": secrets.token_hex(16), "email": email.lower(), "password_hash": password_hash, "created_at": now_iso()}
        data["users"].append(user)
        self._write(data)
        return user

    def create_session(self, user_id: str) -> str:
        token = secrets.token_urlsafe(32)
        data = self._read()
        data["sessions"].append({"id": secrets.token_hex(16), "user_id": user_id, "token": token, "created_at": now_iso()})
        self._write(data)
        return token

    def user_from_token(self, token: str) -> Dict[str, Any]:
        data = self._read()
        session = next((row for row in data["sessions"] if row["token"] == token), None)
        if not session:
            raise HTTPException(status_code=401, detail="Invalid or expired session token")
        user = next((row for row in data["users"] if row["id"] == session["user_id"]), None)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

    def create_split(self, user_id: str, payload: SplitPayload) -> Dict[str, Any]:
        data = self._read()
        split_id = secrets.token_hex(16)
        split = {
            "id": split_id,
            "user_id": user_id,
            "title": payload.title,
            "total_amount": payload.total_amount,
            "mode": payload.mode,
            "created_at": now_iso(),
        }
        data["splits"].append(split)
        for person in payload.people:
            data["people"].append({"id": secrets.token_hex(16), "split_id": split_id, "name": person.name, "amount": person.amount, "paid": person.paid})
        for item in payload.items:
            data["items"].append({"id": secrets.token_hex(16), "split_id": split_id, "item_name": item.item_name, "price": item.price, "assigned_to": item.assigned_to})
        self._write(data)
        return self.get_split(user_id, split_id)

    def get_split(self, user_id: str, split_id: str) -> Dict[str, Any]:
        data = self._read()
        split = next((row for row in data["splits"] if row["id"] == split_id and row["user_id"] == user_id), None)
        if not split:
            raise HTTPException(status_code=404, detail="Split record not found")
        return {
            **split,
            "people": [p for p in data["people"] if p["split_id"] == split_id],
            "items": [i for i in data["items"] if i["split_id"] == split_id],
        }

    def list_splits(self, user_id: str) -> List[Dict[str, Any]]:
        data = self._read()
        splits = [row for row in data["splits"] if row["user_id"] == user_id]
        splits.sort(key=lambda row: row.get("created_at", ""), reverse=True)
        return [self.get_split(user_id, split["id"]) for split in splits]


class SupabaseStore:
    def __init__(self) -> None:
        self.base_url = f"{SUPABASE_URL}/rest/v1"
        self.headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
        }

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        headers = {**self.headers, **kwargs.pop("headers", {})}
        response = requests.request(method, f"{self.base_url}{path}", headers=headers, timeout=15, **kwargs)
        if response.status_code >= 400:
            raise HTTPException(status_code=500, detail=f"Supabase error: {response.text}")
        if response.text:
            return response.json()
        return None

    def find_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        rows = self._request("GET", f"/users?email=eq.{quote(email.lower())}&select=*")
        return rows[0] if rows else None

    def create_user(self, email: str, password_hash: str) -> Dict[str, Any]:
        rows = self._request("POST", "/users", json={"email": email.lower(), "password_hash": password_hash}, headers={"Prefer": "return=representation"})
        return rows[0]

    def create_session(self, user_id: str) -> str:
        token = secrets.token_urlsafe(32)
        self._request("POST", "/sessions", json={"user_id": user_id, "token": token}, headers={"Prefer": "return=minimal"})
        return token

    def user_from_token(self, token: str) -> Dict[str, Any]:
        rows = self._request("GET", f"/sessions?token=eq.{quote(token)}&select=user_id")
        if not rows:
            raise HTTPException(status_code=401, detail="Invalid or expired session token")
        user_rows = self._request("GET", f"/users?id=eq.{quote(rows[0]['user_id'])}&select=id,email")
        if not user_rows:
            raise HTTPException(status_code=401, detail="User not found")
        return user_rows[0]

    def create_split(self, user_id: str, payload: SplitPayload) -> Dict[str, Any]:
        split_rows = self._request(
            "POST",
            "/splits",
            json={"user_id": user_id, "title": payload.title, "total_amount": payload.total_amount, "mode": payload.mode},
            headers={"Prefer": "return=representation"},
        )
        split_id = split_rows[0]["id"]
        if payload.people:
            people_rows = [{"split_id": split_id, "name": p.name, "amount": p.amount, "paid": p.paid} for p in payload.people]
            self._request("POST", "/split_people", json=people_rows, headers={"Prefer": "return=minimal"})
        if payload.items:
            item_rows = [{"split_id": split_id, "item_name": i.item_name, "price": i.price, "assigned_to": i.assigned_to} for i in payload.items]
            self._request("POST", "/split_items", json=item_rows, headers={"Prefer": "return=minimal"})
        return self.get_split(user_id, split_id)

    def get_split(self, user_id: str, split_id: str) -> Dict[str, Any]:
        rows = self._request("GET", f"/splits?id=eq.{quote(split_id)}&user_id=eq.{quote(user_id)}&select=*")
        if not rows:
            raise HTTPException(status_code=404, detail="Split record not found")
        split = rows[0]
        split["people"] = self._request("GET", f"/split_people?split_id=eq.{quote(split_id)}&select=id,name,amount,paid") or []
        split["items"] = self._request("GET", f"/split_items?split_id=eq.{quote(split_id)}&select=id,item_name,price,assigned_to") or []
        return split

    def list_splits(self, user_id: str) -> List[Dict[str, Any]]:
        rows = self._request("GET", f"/splits?user_id=eq.{quote(user_id)}&select=*&order=created_at.desc") or []
        return [self.get_split(user_id, row["id"]) for row in rows]


store = MockStore() if USE_MOCK_DB else SupabaseStore()


def public_user(user: Dict[str, Any]) -> Dict[str, str]:
    return {"id": str(user["id"]), "email": user["email"]}


def bearer_token(authorization: Optional[str]) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Authorization bearer token required")
    return authorization.split(" ", 1)[1].strip()


def current_user(authorization: Optional[str]) -> Dict[str, Any]:
    return store.user_from_token(bearer_token(authorization))


@app.get("/api/health")
def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "database": "mock-json" if USE_MOCK_DB else "supabase",
        "supabase_configured": not USE_MOCK_DB,
    }


@app.post("/api/auth/register")
def register(payload: AuthPayload) -> Dict[str, Any]:
    existing = store.find_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="An account already exists for this email. Please sign in.")
    user = store.create_user(payload.email, hash_password(payload.password))
    token = store.create_session(str(user["id"]))
    return {"message": "Account created", "user": public_user(user), "token": token}


@app.post("/api/auth/login")
def login(payload: AuthPayload) -> Dict[str, Any]:
    user = store.find_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Email or password is incorrect")
    token = store.create_session(str(user["id"]))
    return {"message": "Signed in", "user": public_user(user), "token": token}


@app.post("/api/splits")
def create_split(payload: SplitPayload, authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    if payload.mode not in {"equal", "smart"}:
        raise HTTPException(status_code=422, detail="mode must be equal or smart")
    if len(payload.people) < 2:
        raise HTTPException(status_code=422, detail="At least two people are required")
    if payload.total_amount <= 0:
        raise HTTPException(status_code=422, detail="Total amount must be above zero")
    user = current_user(authorization)
    return store.create_split(str(user["id"]), payload)


@app.get("/api/splits")
def list_splits(authorization: Optional[str] = Header(None)) -> List[Dict[str, Any]]:
    user = current_user(authorization)
    return store.list_splits(str(user["id"]))


@app.get("/api/splits/{split_id}")
def get_split(split_id: str, authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = current_user(authorization)
    return store.get_split(str(user["id"]), split_id)


# Required for Vercel serverless Python runtime. Local uvicorn does not need Mangum.
handler = Mangum(app) if Mangum else app
