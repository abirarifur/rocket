'use client';

import { API_BASE } from './api';
import type { RequestDefinition } from '@rocket/types';

export interface HistoryEntry {
  id: string;
  request: RequestDefinition;
  responseMeta: { status: number; timeMs: number; sizeBytes: number; tests?: number; testsPassed?: number };
  executedAt: string;
}

export async function listHistory(workspaceId: string): Promise<HistoryEntry[]> {
  const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/history`, {
    credentials: 'include',
  });
  if (!res.ok) return [];
  return (await res.json()) as HistoryEntry[];
}
