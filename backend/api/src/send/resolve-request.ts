import type { ProxyRequest, RequestDefinition } from '@rocket/types';

const RAW_CONTENT_TYPE: Record<string, string> = {
  json: 'application/json',
  xml: 'application/xml',
  html: 'text/html',
  javascript: 'application/javascript',
  text: 'text/plain',
};

function appendQuery(url: string, params: RequestDefinition['params']): string {
  const enabled = params.filter((p) => p.enabled && p.key.trim() !== '');
  if (enabled.length === 0) return url;
  const qs = enabled
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&');
  return url + (url.includes('?') ? '&' : '?') + qs;
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  const lower = name.toLowerCase();
  return Object.keys(headers).some((k) => k.toLowerCase() === lower);
}

/**
 * Lower a stored RequestDefinition into a concrete ProxyRequest: merge enabled
 * params into the URL, collect enabled headers, apply auth, and serialize the
 * body. (Variable interpolation arrives in Phase 3; form-data/binary in a later
 * pass — those modes currently send no body.)
 */
export function resolveRequest(def: RequestDefinition): ProxyRequest {
  let url = appendQuery(def.url, def.params);

  const headers: Record<string, string> = {};
  for (const h of def.headers) {
    if (h.enabled && h.key.trim() !== '') headers[h.key] = h.value;
  }

  // Body serialization.
  let body: string | null = null;
  switch (def.body.mode) {
    case 'raw': {
      body = def.body.raw ?? '';
      const ct = RAW_CONTENT_TYPE[def.body.rawLanguage ?? 'text'];
      if (ct && !hasHeader(headers, 'content-type')) headers['Content-Type'] = ct;
      break;
    }
    case 'urlencoded': {
      const pairs = (def.body.urlencoded ?? []).filter((p) => p.enabled && p.key.trim() !== '');
      body = pairs
        .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join('&');
      if (!hasHeader(headers, 'content-type')) {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      }
      break;
    }
    case 'graphql': {
      let variables: unknown = {};
      try {
        variables = def.body.graphql?.variables ? JSON.parse(def.body.graphql.variables) : {};
      } catch {
        variables = {};
      }
      body = JSON.stringify({ query: def.body.graphql?.query ?? '', variables });
      if (!hasHeader(headers, 'content-type')) headers['Content-Type'] = 'application/json';
      break;
    }
    case 'none':
    default:
      body = null;
  }

  // Auth.
  switch (def.auth.type) {
    case 'basic': {
      const { username = '', password = '' } = def.auth.basic ?? {};
      const token = Buffer.from(`${username}:${password}`).toString('base64');
      headers['Authorization'] = `Basic ${token}`;
      break;
    }
    case 'bearer': {
      headers['Authorization'] = `Bearer ${def.auth.bearer?.token ?? ''}`;
      break;
    }
    case 'apikey': {
      const { key = '', value = '', in: location = 'header' } = def.auth.apikey ?? {};
      if (key) {
        if (location === 'query') {
          url = url + (url.includes('?') ? '&' : '?') + `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        } else {
          headers[key] = value;
        }
      }
      break;
    }
    default:
      break; // none / inherit
  }

  return { method: def.method, url, headers, body, followRedirects: true };
}
