'use client';

import type { Variable } from '@rocket/types';
import { useApp } from '@/store/appStore';
import { buildVarMap, interpolate } from './vars';

/**
 * Resolve {{variables}} in a string using the active scope (globals < collection <
 * environment) — the same precedence the backend uses for HTTP requests. Connection
 * panels (WebSocket / Socket.IO) connect from the browser, so they interpolate here.
 */
export function useResolvedUrl(raw: string): string {
  const { environments, activeEnvironmentId, activeCollectionId, cache, globals } = useApp();
  const envVars = environments.find((e) => e.id === activeEnvironmentId)?.variables ?? [];
  const colVars = ((activeCollectionId && cache[activeCollectionId]?.variables) || []) as Variable[];
  const map = buildVarMap(globals, colVars, envVars);
  return interpolate(raw, map);
}
