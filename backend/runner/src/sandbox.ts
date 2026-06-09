import vm from 'node:vm';
import type { RunScriptRequest, RunScriptResult, ScriptTestResult } from '@rocket/types';
import { Assertion, makeExpect } from './expect.js';

/**
 * Execute a user script in a restricted `node:vm` context with a hard timeout.
 * The context exposes only `pm` and `console` plus standard JS builtins — no
 * require/process/network. Variable writes are captured and returned.
 *
 * NOTE: node:vm is not a hardened security boundary against a determined
 * attacker. The runner runs as its own network-isolated service and exposes no
 * I/O to scripts; production hardening should move to isolated-vm / V8 isolates.
 */
export function runScript(input: RunScriptRequest): RunScriptResult {
  const vars: Record<string, string> = { ...input.variables };
  const setEnv: Record<string, string> = {};
  const setLocal: Record<string, string> = {};
  const tests: ScriptTestResult[] = [];
  const logs: string[] = [];

  const log = (...args: unknown[]) =>
    logs.push(args.map((a) => (typeof a === 'string' ? a : safeStringify(a))).join(' '));

  const responseHeaders = input.response?.headers ?? {};
  const pmResponse = input.response && {
    code: input.response.status,
    status: input.response.statusText,
    responseTime: Math.round(input.response.timeMs),
    text: () => input.response!.body,
    json: () => JSON.parse(input.response!.body),
    headers: { get: (name: string) => responseHeaders[name.toLowerCase()] ?? responseHeaders[name] },
    to: {
      have: {
        status: (code: number) => new Assertion(input.response!.status).equal(code),
        header: (name: string) =>
          new Assertion(
            responseHeaders[name.toLowerCase()] ?? responseHeaders[name],
          ).to.not.undefined,
      },
      be: {
        get ok() {
          return new Assertion(input.response!.status >= 200 && input.response!.status < 300).ok;
        },
      },
    },
  };

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
  };

  const sandbox = { pm, console: { log, info: log, warn: log, error: log } };
  vm.createContext(sandbox);

  let error: string | undefined;
  try {
    vm.runInContext(input.script, sandbox, { timeout: input.timeoutMs ?? 2000 });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  return { tests, logs, setEnv, setLocal, error };
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
