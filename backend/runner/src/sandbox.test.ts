import { describe, expect, it } from 'vitest';
import { runScript } from './sandbox.js';
import type { RunScriptRequest } from '@rocket/types';

const baseReq = {
  name: 't',
  kind: 'http' as const,
  method: 'GET' as const,
  url: 'https://x.test',
  params: [],
  headers: [],
  body: { mode: 'none' as const },
  auth: { type: 'none' as const },
};

const resp = {
  status: 200,
  statusText: 'OK',
  headers: { 'content-type': 'application/json' },
  body: '{"id":42,"name":"rocket"}',
  setCookies: [],
  truncated: false,
  timeMs: 12,
  sizeBytes: 24,
};

describe('runScript', async () => {
  it('runs a pre-request script that sets a variable', async () => {
    const input: RunScriptRequest = {
      phase: 'pre',
      script: 'pm.environment.set("token", "abc" + 123);',
      request: baseReq,
      variables: {},
    };
    const r = await runScript(input, "http://localhost:4100");
    expect(r.error).toBeUndefined();
    expect(r.setEnv.token).toBe('abc123');
  });

  it('runs test assertions (pass + fail)', async () => {
    const input: RunScriptRequest = {
      phase: 'test',
      script: `
        pm.test("status is 200", () => pm.response.to.have.status(200));
        pm.test("has id 42", () => pm.expect(pm.response.json().id).to.equal(42));
        pm.test("this fails", () => pm.expect(1).to.equal(2));
      `,
      request: baseReq,
      response: resp,
      variables: {},
    };
    const r = await runScript(input, "http://localhost:4100");
    expect(r.tests).toHaveLength(3);
    expect(r.tests[0]?.passed).toBe(true);
    expect(r.tests[1]?.passed).toBe(true);
    expect(r.tests[2]?.passed).toBe(false);
  });

  it('terminates infinite loops via timeout', async () => {
    const input: RunScriptRequest = {
      phase: 'pre',
      script: 'while (true) {}',
      request: baseReq,
      variables: {},
      timeoutMs: 200,
    };
    const r = await runScript(input, "http://localhost:4100");
    expect(r.error).toBeTruthy();
  });

  it('has no access to require or process', async () => {
    const input: RunScriptRequest = {
      phase: 'pre',
      script: 'pm.environment.set("leak", typeof process + "/" + typeof require);',
      request: baseReq,
      variables: {},
    };
    const r = await runScript(input, "http://localhost:4100");
    expect(r.setEnv.leak).toBe('undefined/undefined');
  });
});
