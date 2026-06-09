import type { RequestDefinition } from '@rocket/types';

/** Tokenize a shell-ish command respecting single/double quotes and backslash-newlines. */
function tokenize(cmd: string): string[] {
  const cleaned = cmd.replace(/\\\r?\n/g, ' ');
  const tokens: string[] = [];
  let cur = '';
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i]!;
    if (quote) {
      if (c === quote) quote = null;
      else cur += c;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (/\s/.test(c)) {
      if (cur) {
        tokens.push(cur);
        cur = '';
      }
    } else {
      cur += c;
    }
  }
  if (cur) tokens.push(cur);
  return tokens;
}

/** Parse a `curl` command into a RequestDefinition (best-effort). */
export function parseCurl(command: string): RequestDefinition {
  const tokens = tokenize(command.trim());
  const req: RequestDefinition = {
    name: 'Imported from cURL',
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    body: { mode: 'none' },
    auth: { type: 'none' },
  };
  let explicitMethod = false;
  let bodyData: string | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]!;
    const next = () => tokens[++i] ?? '';
    switch (true) {
      case t === 'curl':
        break;
      case t === '-X' || t === '--request':
        req.method = next().toUpperCase() as RequestDefinition['method'];
        explicitMethod = true;
        break;
      case t === '-H' || t === '--header': {
        const h = next();
        const idx = h.indexOf(':');
        if (idx > 0) req.headers.push({ key: h.slice(0, idx).trim(), value: h.slice(idx + 1).trim(), enabled: true });
        break;
      }
      case t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary':
        bodyData = (bodyData ? bodyData + '&' : '') + next();
        break;
      case t === '-u' || t === '--user': {
        const [username, password = ''] = next().split(':');
        req.auth = { type: 'basic', basic: { username: username ?? '', password } };
        break;
      }
      case t === '--url':
        req.url = next();
        break;
      case t.startsWith('-'):
        // Unknown flag with a value we can skip (e.g. --compressed has none).
        if (['-A', '--user-agent', '-e', '--referer', '-b', '--cookie'].includes(t)) next();
        break;
      default:
        if (!req.url && /^https?:\/\//i.test(t)) req.url = t;
        else if (!req.url) req.url = t;
    }
  }

  if (bodyData !== null) {
    if (!explicitMethod) req.method = 'POST';
    const isForm = req.headers.some(
      (h) => h.key.toLowerCase() === 'content-type' && h.value.includes('x-www-form-urlencoded'),
    );
    if (isForm) {
      req.body = {
        mode: 'urlencoded',
        urlencoded: bodyData.split('&').map((pair) => {
          const [k, v = ''] = pair.split('=');
          return { key: decodeURIComponent(k ?? ''), value: decodeURIComponent(v), enabled: true };
        }),
      };
    } else {
      const looksJson = /^\s*[[{]/.test(bodyData);
      req.body = { mode: 'raw', raw: bodyData, rawLanguage: looksJson ? 'json' : 'text' };
    }
  }

  return req;
}
