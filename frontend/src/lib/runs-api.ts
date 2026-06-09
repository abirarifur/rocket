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

export interface RunRequestResult {
  name: string;
  ok: boolean;
  status: number | null;
  timeMs: number | null;
  error: string | null;
  tests: { name: string; passed: boolean; error?: string }[];
}

export interface CollectionRun {
  id: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  iterations: number;
  totalRequests: number;
  passed: number;
  failed: number;
  error: string | null;
  report: { iteration: number; requests: RunRequestResult[] }[];
}

export interface RunOptions {
  environmentId?: string | null;
  iterations?: number;
  data?: { type: 'json' | 'csv'; content: string } | null;
}

export const startRun = (collectionId: string, opts: RunOptions) =>
  req<CollectionRun>(`/collections/${collectionId}/run`, {
    method: 'POST',
    body: JSON.stringify(opts),
  });

export const getRun = (runId: string) => req<CollectionRun>(`/runs/${runId}`);
