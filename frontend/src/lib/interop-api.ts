'use client';

import { API_BASE } from './api';
import type { RequestDefinition } from '@rocket/types';

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

export type ImportType = 'postman' | 'openapi' | 'har';

export const importCollection = (workspaceId: string, type: ImportType, content: string) =>
  req<{ id: string; name: string }>(`/workspaces/${workspaceId}/import`, {
    method: 'POST',
    body: JSON.stringify({ type, content }),
  });

export const importCurl = (command: string) =>
  req<RequestDefinition>(`/import/curl`, { method: 'POST', body: JSON.stringify({ command }) });

export async function exportCollection(collectionId: string): Promise<unknown> {
  return req<unknown>(`/collections/${collectionId}/export`);
}
