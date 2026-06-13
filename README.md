# SplitEats+ 🍽️

> A smart bill splitting app — React + TypeScript frontend, Python FastAPI backend, Supabase database. Deployed entirely on Vercel.

---

## Project Structure

```
spliteats/
├── api/
│   ├── index.py          # FastAPI backend (Vercel serverless function)
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── pages/        # LoginPage, DashboardPage, PeoplePage, ItemsPage, SplitPage, SummaryPage, RecordsPage
│   │   ├── components/   # AppShell, ThreeDButton, ProgressSteps, StepCard
│   │   ├── services/     # api.ts — all backend API calls
│   │   ├── types/        # models.ts — TypeScript types
│   │   ├── App.tsx       # Router and protected routes
│   │   ├── main.tsx      # React entry point
│   │   └── styles.css    # Global styles
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── .env.example          # Environment variable template
├── .gitignore
├── requirements.txt      # Root-level for Vercel Python runtime
├── vercel.json           # Vercel deployment config
└── README.md
```

---

## Supabase Setup

Run this SQL in your Supabase SQL Editor:

```sql
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz default now()
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz default now()
);

create table if not exists splits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  total_amount float not null,
  mode text not null,
  created_at timestamptz default now()
);

create table if not exists split_people (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references splits(id) on delete cascade,
  name text not null,
  amount float not null,
  paid boolean default false
);

create table if not exists split_items (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references splits(id) on delete cascade,
  item_name text not null,
  price float not null,
  assigned_to text
);
```

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to vercel.com → New Project → import the repo
3. **Do NOT change** the root directory — leave it as `/`
4. Add these Environment Variables in Vercel Project Settings:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | your service role key |
| `USE_MOCK_DB` | `false` |
| `CORS_ORIGINS` | `https://your-app.vercel.app` |

5. Click Deploy

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Check backend status and database mode |
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login existing user |
| POST | `/api/splits` | Save a bill split |
| GET | `/api/splits` | List all splits for current user |
| GET | `/api/splits/{id}` | Get a specific split |

---

## Security

- Passwords hashed with PBKDF2-SHA256 (120,000 iterations) server-side
- Session tokens stored in localStorage (frontend) — never the password
- Supabase credentials stored as Vercel environment variables
- `.env` excluded from git via `.gitignore`
- CORS configured to allow only specified origins
