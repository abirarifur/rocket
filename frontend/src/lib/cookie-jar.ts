'use client';

// Per-workspace cookie jar (localStorage). Captures Set-Cookie from responses
// and re-attaches matching cookies on subsequent requests, like Postman.

export interface StoredCookie {
  name: string;
  value: string;
  domain: string; // host
  path: string;
}

const key = (workspaceId: string) => `rocket-cookies-${workspaceId}`;

function hostOf(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export function load(workspaceId: string): StoredCookie[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key(workspaceId)) ?? '[]') as StoredCookie[];
  } catch {
    return [];
  }
}

function save(workspaceId: string, cookies: StoredCookie[]) {
  localStorage.setItem(key(workspaceId), JSON.stringify(cookies));
}

export function clear(workspaceId: string) {
  localStorage.removeItem(key(workspaceId));
}

/** Parse Set-Cookie strings from a response and store them against the URL host. */
export function storeFromResponse(workspaceId: string, url: string, setCookies: string[]) {
  const host = hostOf(url);
  if (!host || setCookies.length === 0) return;
  const jar = load(workspaceId);
  for (const raw of setCookies) {
    const [pair, ...attrs] = raw.split(';');
    const eq = pair.indexOf('=');
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    const attrMap = Object.fromEntries(
      attrs.map((a) => {
        const i = a.indexOf('=');
        return i < 0 ? [a.trim().toLowerCase(), ''] : [a.slice(0, i).trim().toLowerCase(), a.slice(i + 1).trim()];
      }),
    );
    const domain = (attrMap['domain'] as string)?.replace(/^\./, '') || host;
    const path = (attrMap['path'] as string) || '/';
    const maxAge = attrMap['max-age'];
    const idx = jar.findIndex((c) => c.name === name && c.domain === domain && c.path === path);
    if (maxAge === '0') {
      if (idx >= 0) jar.splice(idx, 1);
      continue;
    }
    const cookie: StoredCookie = { name, value, domain, path };
    if (idx >= 0) jar[idx] = cookie;
    else jar.push(cookie);
  }
  save(workspaceId, jar);
}

/** Build a Cookie header for a request URL from the jar (host + path match). */
export function cookieHeaderFor(workspaceId: string, url: string): string {
  const host = hostOf(url);
  let path = '/';
  try {
    path = new URL(url).pathname || '/';
  } catch {
    return '';
  }
  if (!host) return '';
  const matches = load(workspaceId).filter(
    (c) => (host === c.domain || host.endsWith('.' + c.domain)) && path.startsWith(c.path),
  );
  return matches.map((c) => `${c.name}=${c.value}`).join('; ');
}
