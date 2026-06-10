'use client';

import { API_BASE } from './api';
import type { RequestAuth, RequestDefinition } from '@rocket/types';

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/api${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  visibility: string;
  teamId: string;
  teamName: string;
  role: string;
}

export interface CollectionSummary {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
}

export interface WorkspaceDetail {
  id: string;
  name: string;
  visibility: string;
  collections: CollectionSummary[];
}

export interface CollectionFull {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  variables: unknown[];
  // auth is RequestAuth from @rocket/types (collection-level, inherited by requests)
  auth?: RequestAuth | null;
  // tree is CollectionNode[] from @rocket/types
  tree: unknown[];
}

export interface ProxyResponseDto {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  setCookies?: string[];
  truncated: boolean;
  timeMs: number;
  sizeBytes: number;
}

export interface ScriptTest {
  name: string;
  passed: boolean;
  error?: string;
}

export interface SendResult {
  ok: boolean;
  response?: ProxyResponseDto;
  error?: { error: string; code: string };
  historyId?: string;
  tests?: ScriptTest[];
  logs?: string[];
  scriptError?: string;
}

export const listWorkspaces = () => req<WorkspaceSummary[]>('/workspaces');

export const getWorkspace = (id: string) => req<WorkspaceDetail>(`/workspaces/${id}`);

export const getCollection = (id: string) => req<CollectionFull>(`/collections/${id}`);

export const createCollection = (workspaceId: string, name: string) =>
  req<CollectionFull>(`/workspaces/${workspaceId}/collections`, {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

export const updateCollection = (
  id: string,
  patch: { name?: string; description?: string; tree?: unknown[]; variables?: unknown[]; auth?: RequestAuth },
) => req<CollectionFull>(`/collections/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });

export const deleteCollection = (id: string) =>
  req<{ ok: true }>(`/collections/${id}`, { method: 'DELETE' });

export const sendRequest = (
  workspaceId: string,
  request: RequestDefinition,
  scope?: { environmentId?: string | null; collectionId?: string | null },
) =>
  req<SendResult>('/send', {
    method: 'POST',
    body: JSON.stringify({
      workspaceId,
      request,
      environmentId: scope?.environmentId ?? null,
      collectionId: scope?.collectionId ?? null,
    }),
  });

export const updateCollectionVariables = (id: string, variables: unknown[]) =>
  updateCollection(id, { variables });

export const updateCollectionAuth = (id: string, auth: RequestAuth) =>
  updateCollection(id, { auth });

export interface UploadResult {
  key: string;
  filename: string;
  size: number;
  contentType: string;
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/api/uploads`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  return (await res.json()) as UploadResult;
}
