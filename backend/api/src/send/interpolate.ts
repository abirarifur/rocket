import type { RequestDefinition, Variable } from '@rocket/types';

/**
 * Build a resolved variable map from ordered scopes (lowest precedence first).
 * Later scopes override earlier ones — matching Postman's
 * global < collection < environment < local ordering.
 */
export function resolveVariableMap(...scopes: Variable[][]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const scope of scopes) {
    for (const v of scope) {
      if (v.enabled && v.key.trim() !== '') map[v.key] = v.value;
    }
  }
  return map;
}

const TOKEN = /\{\{\s*([\w.-]+)\s*\}\}/g;

/** Replace {{var}} tokens in a string; unknown variables are left intact. */
export function interpolate(input: string, vars: Record<string, string>): string {
  return input.replace(TOKEN, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key]! : match,
  );
}

/** Apply variable interpolation across every text field of a request. */
export function interpolateRequest(
  def: RequestDefinition,
  vars: Record<string, string>,
): RequestDefinition {
  const s = (v: string) => interpolate(v, vars);
  return {
    ...def,
    url: s(def.url),
    params: def.params.map((p) => ({ ...p, key: s(p.key), value: s(p.value) })),
    headers: def.headers.map((h) => ({ ...h, key: s(h.key), value: s(h.value) })),
    body: {
      ...def.body,
      raw: def.body.raw !== undefined ? s(def.body.raw) : def.body.raw,
      formData: def.body.formData?.map((f) => ({ ...f, key: s(f.key), value: s(f.value) })),
      urlencoded: def.body.urlencoded?.map((p) => ({ ...p, key: s(p.key), value: s(p.value) })),
      graphql: def.body.graphql
        ? {
            query: s(def.body.graphql.query),
            variables:
              def.body.graphql.variables !== undefined
                ? s(def.body.graphql.variables)
                : def.body.graphql.variables,
          }
        : def.body.graphql,
    },
    auth: interpolateAuth(def.auth, vars),
  };
}

/** Interpolate {{variables}} in every string field of each auth config block. */
function interpolateAuth(
  auth: RequestDefinition['auth'],
  vars: Record<string, string>,
): RequestDefinition['auth'] {
  const next = { ...auth } as Record<string, unknown>;
  const interpObject = (obj: unknown): unknown => {
    if (!obj || typeof obj !== 'object') return obj;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = typeof v === 'string' ? interpolate(v, vars) : v;
    }
    return out;
  };
  for (const block of [
    'basic',
    'bearer',
    'apikey',
    'jwt',
    'oauth2',
    'oauth1',
    'awsv4',
    'hawk',
    'digest',
    'ntlm',
    'edgegrid',
    'asap',
  ] as const) {
    if (next[block]) next[block] = interpObject(next[block]);
  }
  return next as RequestDefinition['auth'];
}
