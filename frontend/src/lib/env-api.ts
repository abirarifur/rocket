'use client';

import { API_BASE } from './api';
import type { Variable } from '@rocket/types';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { message?: string }).message ?? `Failed (${res.status})`);
  return data as T;
}

export interface Environment {
  id: string;
  workspaceId: string;
  name: string;
  variables: Variable[];
}

export const listEnvironments = (workspaceId: string) =>
  req<Environment[]>(`/workspaces/${workspaceId}/environments`);

export const createEnvironment = (workspaceId: string, name: string, variables: Variable[] = []) =>
  req<Environment>(`/workspaces/${workspaceId}/environments`, {
    method: 'POST',
    body: JSON.stringify({ name, variables }),
  });

export const updateEnvironment = (
  id: string,
  patch: { name?: string; variables?: Variable[] },
) => req<Environment>(`/environments/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });

export const deleteEnvironment = (id: string) =>
  req<{ ok: true }>(`/environments/${id}`, { method: 'DELETE' });
