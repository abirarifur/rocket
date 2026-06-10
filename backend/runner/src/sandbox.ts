import vm from 'node:vm';
import type { RunScriptRequest, RunScriptResult, ScriptTestResult } from '@rocket/types';
import { Assertion, makeExpect } from './expect.js';

/**
 * Execute a user script in a restricted `node:vm` context with a hard timeout.
 * The context exposes only `pm` and `console` plus standard JS builtins — no
 * require/process/ambient network. `pm.sendRequest` is the one network capability
 * and it is mediated by the proxy service (so SSRF protection still applies).
 *
 * NOTE: node:vm is not a hardened security boundary against a determined
 * attacker; production hardening should move to isolated-vm / V8 isolates.
 */
export async function runScript(input: RunScriptRequest, proxyBase: string): Promise<RunScriptResult> {
  const vars: Record<string, string> = { ...input.variables };
  const setEnv: Record<string, string> = {};
  const setLocal: Record<string, string> = {};
  const tests: ScriptTestResult[] = [];
  const logs: string[] = [];

  const log = (...args: unknown[]) =>
    logs.push(args.map((a) => (typeof a === 'string' ? a : safeStringify(a))).join(' '));

  const responseHeaders = input.response?.headers ?? {};
  const pmResponse = input.response && makePmResponse(input.response);

  const pm = {
    variables: {
      get: (k: string) => vars[k],
      set: (k: string, v: unknown) => {
        vars[k] = String(v);
        setLocal[k] = String(v);
      },
    },
    environment: {
      get: (k: string) => vars[k],
      set: (k: string, v: unknown) => {
        vars[k] = String(v);
        setEnv[k] = String(v);
      },
    },
    request: {
      method: input.request.method,
      url: input.request.url,
      headers: {
        get: (name: string) =>
          input.request.headers.find((h) => h.key.toLowerCase() === name.toLowerCase())?.value,
      },
    },
    response: pmResponse,
    expect: makeExpect(),
    test: (name: string, fn: () => void) => {
      try {
        fn();
        tests.push({ name, passed: true });
      } catch (e) {
        tests.push({ name, passed: false, error: e instanceof Error ? e.message : String(e) });
      }
    },
    /** Make an HTTP request from within the script (routed via the proxy). */
    sendRequest: (
      reqArg: unknown,
      cb?: (err: Error | null, res?: unknown) => void,
    ): Promise<unknown> => {
      const p = doSend(reqArg, proxyBase);
      if (typeof cb === 'function') p.then((r) => cb(null, r), (e) => cb(e as Error));
      return p;
    },
  };

  const sandbox = { pm, console: { log, info: log, warn: log, error: log } };
  vm.createContext(sandbox);

  const timeoutMs = input.timeoutMs ?? 2000;
  let error: string | undefined;
  try {
    // Wrap in an async IIFE so the script can `await pm.sendRequest(...)`.
    const promise = vm.runInContext(`(async () => {\n${input.script}\n})()`, sandbox, {
      timeout: timeoutMs,
    }) as Promise<unknown>;
    await Promise.race([
      Promise.resolve(promise),
      new Promise((_resolve, reject) =>
        setTimeout(() => reject(new Error('Script timed out')), timeoutMs + 10_000),
      ),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return { tests, logs, setEnv, setLocal, error };
}

function makePmResponse(r: NonNullable<RunScriptRequest['response']>) {
  const headers = r.headers;
  return {
    code: r.status,
    status: r.statusText,
    responseTime: Math.round(r.timeMs),
    text: () => r.body,
    json: () => JSON.parse(r.body),
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? headers[name] },
    to: {
      have: {
        status: (code: number) => new Assertion(r.status).equal(code),
        header: (name: string) =>
          new Assertion(headers[name.toLowerCase()] ?? headers[name]).to.not.undefined,
      },
      be: {
        get ok() {
          return new Assertion(r.status >= 200 && r.status < 300).ok;
        },
      },
    },
  };
}

/** Perform a sendRequest via the proxy and shape it like a pm response. */
async function doSend(reqArg: unknown, proxyBase: string): Promise<unknown> {
  let proxyReq: Record<string, unknown>;
  if (typeof reqArg === 'string') {
    proxyReq = { method: 'GET', url: reqArg, headers: {}, body: null, bodyEncoding: 'utf8' };
  } else {
    const r = (reqArg ?? {}) as Record<string, unknown>;
    const headers: Record<string, string> = {};
    const hdr = r.header ?? r.headers;
    if (Array.isArray(hdr)) for (const h of hdr) headers[(h as { key: string }).key] = (h as { value: string }).value;
    else if (hdr && typeof hdr === 'object') Object.assign(headers, hdr);
    let body: string | null = null;
    const b = r.body as { raw?: string; mode?: string } | string | undefined;
    if (typeof b === 'string') body = b;
    else if (b && typeof b === 'object') body = b.raw ?? JSON.stringify(b);
    proxyReq = {
      method: String(r.method ?? 'GET').toUpperCase(),
      url: r.url,
      headers,
      body,
      bodyEncoding: 'utf8',
      followRedirects: true,
    };
  }

  const res = await fetch(`${proxyBase}/proxy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(proxyReq),
  });
  const data = (await res.json()) as
    | { status: number; statusText: string; headers: Record<string, string>; body: string; timeMs: number }
    | { error: string; code: string };
  if (!res.ok || 'code' in data) {
    throw new Error('sendRequest failed: ' + ('error' in data ? data.error : res.status));
  }
  return makePmResponse({ ...data, setCookies: [], truncated: false, sizeBytes: data.body.length });
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
