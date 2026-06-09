'use client';

import { API_BASE } from './api';

export interface MeWorkspace {
  id: string;
  name: string;
  visibility: string;
}
export interface MeTeam {
  id: string;
  name: string;
  role: string;
  workspaces: MeWorkspace[];
}
export interface Me {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  teams: MeTeam[];
  defaultWorkspace: MeWorkspace | null;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/api/auth/${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export const register = (email: string, password: string, name?: string) =>
  post<Me>('register', { email, password, name });

export const login = (email: string, password: string) => post<Me>('login', { email, password });

export const logout = () => post<{ ok: true }>('logout', {});

export const verifyEmail = (token: string) => post<{ ok: true }>('verify-email', { token });

export const requestPasswordReset = (email: string) =>
  post<{ ok: true }>('request-password-reset', { email });

export const resetPassword = (token: string, password: string) =>
  post<{ ok: true }>('reset-password', { token, password });

export async function fetchMe(): Promise<Me | null> {
  const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
  if (!res.ok) return null;
  return (await res.json()) as Me;
}
