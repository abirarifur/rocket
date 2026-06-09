'use client';

import { API_BASE } from './api';

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

export type Role = 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';

export interface Member {
  userId: string;
  email: string;
  name: string | null;
  role: Role;
}

export const listMembers = (teamId: string) => req<Member[]>(`/teams/${teamId}/members`);

export const invite = (teamId: string, email: string, role: Role) =>
  req<{ ok: true }>(`/teams/${teamId}/invitations`, {
    method: 'POST',
    body: JSON.stringify({ email, role }),
  });

export const acceptInvite = (token: string) =>
  req<{ ok: true; teamId: string }>(`/invitations/accept`, {
    method: 'POST',
    body: JSON.stringify({ token }),
  });

export const changeRole = (teamId: string, userId: string, role: Role) =>
  req<{ ok: true }>(`/teams/${teamId}/members/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });

export const removeMember = (teamId: string, userId: string) =>
  req<{ ok: true }>(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' });

export const createWorkspace = (teamId: string, name: string, visibility: 'TEAM' | 'PERSONAL' = 'TEAM') =>
  req<{ id: string; name: string }>(`/teams/${teamId}/workspaces`, {
    method: 'POST',
    body: JSON.stringify({ name, visibility }),
  });

export const updateWorkspace = (id: string, patch: { name?: string; visibility?: string }) =>
  req<{ id: string; visibility: string }>(`/workspaces/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const forkCollection = (collectionId: string, workspaceId: string, name?: string) =>
  req<{ id: string; name: string }>(`/collections/${collectionId}/fork`, {
    method: 'POST',
    body: JSON.stringify({ workspaceId, name }),
  });

export const ROLE_RANK: Record<Role, number> = { VIEWER: 0, EDITOR: 1, ADMIN: 2, OWNER: 3 };
export const canEdit = (role: Role | null) => !!role && ROLE_RANK[role] >= ROLE_RANK.EDITOR;
export const canAdmin = (role: Role | null) => !!role && ROLE_RANK[role] >= ROLE_RANK.ADMIN;
