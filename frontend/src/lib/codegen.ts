import type { RequestDefinition } from '@rocket/types';

export type CodeLang = 'curl' | 'fetch' | 'axios' | 'python' | 'go';

export const LANGS: { id: CodeLang; label: string }[] = [
  { id: 'curl', label: 'cURL' },
  { id: 'fetch', label: 'JavaScript (fetch)' },
  { id: 'axios', label: 'JavaScript (axios)' },
  { id: 'python', label: 'Python (requests)' },
  { id: 'go', label: 'Go (net/http)' },
];

/** Resolve a request into a concrete (method, url, headers, body) for codegen. */
function materialize(req: RequestDefinition) {
  const enabled = <T extends { enabled: boolean; key: string }>(rows: T[]) =>
    rows.filter((r) => r.enabled && r.key.trim() !== '');

  let url = req.url;
  const qs = enabled(req.params)
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join('&');
  if (qs) url += (url.includes('?') ? '&' : '?') + qs;

  const headers: Record<string, string> = {};
  for (const h of enabled(req.headers)) headers[h.key] = h.value;

  let body: string | null = null;
  if (req.body.mode === 'raw') {
    body = req.body.raw ?? '';
    if (!hasHeader(headers, 'content-type') && req.body.rawLanguage === 'json')
      headers['Content-Type'] = 'application/json';
  } else if (req.body.mode === 'urlencoded') {
    body = enabled(req.body.urlencoded ?? [])
      .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
      .join('&');
    if (!hasHeader(headers, 'content-type')) headers['Content-Type'] = 'application/x-www-form-urlencoded';
  } else if (req.body.mode === 'graphql') {
    body = JSON.stringify({ query: req.body.graphql?.query ?? '', variables: {} });
    if (!hasHeader(headers, 'content-type')) headers['Content-Type'] = 'application/json';
  }

  if (req.auth.type === 'bearer') headers['Authorization'] = `Bearer ${req.auth.bearer?.token ?? ''}`;
  else if (req.auth.type === 'basic')
    headers['Authorization'] = `Basic <base64(${req.auth.basic?.username}:${req.auth.basic?.password})>`;
  else if (req.auth.type === 'apikey' && req.auth.apikey?.in === 'header' && req.auth.apikey.key)
    headers[req.auth.apikey.key] = req.auth.apikey.value;

  return { method: req.method, url, headers, body };
}

function hasHeader(h: Record<string, string>, name: string) {
  return Object.keys(h).some((k) => k.toLowerCase() === name.toLowerCase());
}

export function generateCode(req: RequestDefinition, lang: CodeLang): string {
  const m = materialize(req);
  switch (lang) {
    case 'curl':
      return [
        `curl -X ${m.method} '${m.url}'`,
        ...Object.entries(m.headers).map(([k, v]) => `  -H '${k}: ${v}'`),
        m.body ? `  --data '${m.body}'` : null,
      ]
        .filter(Boolean)
        .join(' \\\n');

    case 'fetch':
      return `fetch(${JSON.stringify(m.url)}, {
  method: ${JSON.stringify(m.method)},
  headers: ${JSON.stringify(m.headers, null, 2)},${m.body ? `\n  body: ${JSON.stringify(m.body)},` : ''}
})
  .then((r) => r.json())
  .then(console.log);`;

    case 'axios':
      return `import axios from 'axios';

axios({
  method: ${JSON.stringify(m.method.toLowerCase())},
  url: ${JSON.stringify(m.url)},
  headers: ${JSON.stringify(m.headers, null, 2)},${m.body ? `\n  data: ${JSON.stringify(m.body)},` : ''}
}).then((r) => console.log(r.data));`;

    case 'python': {
      const headers = JSON.stringify(m.headers, null, 4).replace(/\n/g, '\n');
      return `import requests

resp = requests.request(
    ${JSON.stringify(m.method)},
    ${JSON.stringify(m.url)},
    headers=${headers},${m.body ? `\n    data=${JSON.stringify(m.body)},` : ''}
)
print(resp.status_code, resp.text)`;
    }

    case 'go':
      return `package main

import (
\t"fmt"
\t"io"
\t"net/http"
\t"strings"
)

func main() {
\treq, _ := http.NewRequest(${JSON.stringify(m.method)}, ${JSON.stringify(m.url)}, ${m.body ? `strings.NewReader(${JSON.stringify(m.body)})` : 'nil'})
${Object.entries(m.headers)
  .map(([k, v]) => `\treq.Header.Set(${JSON.stringify(k)}, ${JSON.stringify(v)})`)
  .join('\n')}
\tresp, _ := http.DefaultClient.Do(req)
\tdefer resp.Body.Close()
\tbody, _ := io.ReadAll(resp.Body)
\tfmt.Println(resp.Status, string(body))
}`;
  }
}
