import type { SavedSplit, SplitItem, SplitPerson, User } from '../types/models';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export type AuthResponse = {
  user: User;
  token: string;
  message: string;
};

export type HealthResponse = {
  status: string;
  database: string;
  supabase_configured: boolean;
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('spliteats_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const detail = typeof body === 'object' && body && 'detail' in body ? String((body as { detail: unknown }).detail) : String(body);
    throw new Error(detail || 'Request failed');
  }
  return body as T;
}

export const api = {
  health: () => request<HealthResponse>('/api/health'),
  register: (email: string, password: string) => request<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  login: (email: string, password: string) => request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  createSplit: (payload: {
    title: string;
    total_amount: number;
    mode: 'equal' | 'smart';
    people: SplitPerson[];
    items: SplitItem[];
  }) => request<SavedSplit>('/api/splits', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  listSplits: () => request<SavedSplit[]>('/api/splits'),
  getSplit: (id: string) => request<SavedSplit>(`/api/splits/${id}`)
};
