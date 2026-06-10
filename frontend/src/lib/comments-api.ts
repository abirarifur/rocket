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

export interface Comment {
  id: string;
  collectionId: string;
  requestNodeId: string | null;
  parentId: string | null;
  body: string;
  createdAt: string;
  author: { id: string; email: string; name: string | null };
}

export const listComments = (collectionId: string) =>
  req<Comment[]>(`/collections/${collectionId}/comments`);

export const addComment = (collectionId: string, body: string, requestNodeId?: string | null) =>
  req<Comment>(`/collections/${collectionId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body, requestNodeId: requestNodeId ?? null }),
  });

export const deleteComment = (id: string) =>
  req<{ ok: true }>(`/comments/${id}`, { method: 'DELETE' });
