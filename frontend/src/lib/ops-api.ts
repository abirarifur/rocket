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

// ── Mocks ──────────────────────────────────────────────────────────────────
export interface MockRoute {
  method: string;
  path: string;
  status: number;
  contentType: string;
  body: string;
}
export interface MockServer {
  id: string;
  name: string;
  enabled: boolean;
  collectionId: string;
  routes: MockRoute[];
}

export const mockUrl = (id: string) => `${API_BASE}/api/mock/${id}`;
export const listMocks = (workspaceId: string) =>
  req<MockServer[]>(`/mocks?workspaceId=${workspaceId}`);
export const createMock = (collectionId: string) =>
  req<MockServer>('/mocks', { method: 'POST', body: JSON.stringify({ collectionId }) });
export const updateMock = (id: string, patch: Partial<Pick<MockServer, 'name' | 'enabled' | 'routes'>>) =>
  req<MockServer>(`/mocks/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteMock = (id: string) => req<{ ok: true }>(`/mocks/${id}`, { method: 'DELETE' });

// ── Monitors ─────────────────────────────────────────────────────────────
export interface Monitor {
  id: string;
  name: string;
  intervalMinutes: number;
  enabled: boolean;
  webhookUrl: string | null;
  lastRunAt: string | null;
  collectionId: string;
}
export interface MonitorRun {
  id: string;
  status: string;
  passed: number;
  failed: number;
  totalRequests: number;
  createdAt: string;
  finishedAt: string | null;
}

export const listMonitors = (workspaceId: string) =>
  req<Monitor[]>(`/monitors?workspaceId=${workspaceId}`);
export const createMonitor = (body: {
  collectionId: string;
  intervalMinutes: number;
  environmentId?: string | null;
  webhookUrl?: string | null;
}) => req<Monitor>('/monitors', { method: 'POST', body: JSON.stringify(body) });
export const updateMonitor = (id: string, patch: Partial<Pick<Monitor, 'enabled' | 'intervalMinutes' | 'name'>>) =>
  req<Monitor>(`/monitors/${id}`, { method: 'PATCH', body: JSON.stringify(patch) });
export const deleteMonitor = (id: string) => req<{ ok: true }>(`/monitors/${id}`, { method: 'DELETE' });
export const monitorRuns = (id: string) => req<MonitorRun[]>(`/monitors/${id}/runs`);

export const docsUrl = (collectionId: string) =>
  `${typeof window !== 'undefined' ? window.location.origin : ''}/docs/${collectionId}`;
