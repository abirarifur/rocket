import type { Variable } from '@rocket/types';

/** Matches {{ variableName }} tokens — mirrors the backend interpolate.ts regex. */
const TOKEN = /\{\{\s*([\w.-]+)\s*\}\}/g;

/** Unique variable names referenced as {{name}} inside a string. */
export function extractTokens(input: string): string[] {
  const seen = new Set<string>();
  for (const m of input.matchAll(TOKEN)) seen.add(m[1]);
  return [...seen];
}

/** Replace {{var}} tokens using the map; unknown variables are left untouched. */
export function interpolate(input: string, vars: Record<string, string>): string {
  return input.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (m, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : m,
  );
}

/**
 * Build a resolved variable map from ordered scopes (lowest precedence first).
 * Later scopes override earlier ones — global < collection < environment.
 */
export function buildVarMap(...scopes: Variable[][]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const scope of scopes) {
    for (const v of scope) {
      if (v.enabled && v.key.trim() !== '') map[v.key] = v.value;
    }
  }
  return map;
}
