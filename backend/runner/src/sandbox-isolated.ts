import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import type { RunScriptRequest, RunScriptResult } from '@rocket/types';
import { runScript } from './sandbox.js';

const emptyResult = (error: string): RunScriptResult => ({
  tests: [],
  logs: [],
  setEnv: {},
  setLocal: {},
  error,
});

/**
 * Run a script in a worker thread with memory limits and a hard wall-clock kill.
 * Falls back to in-process execution when the compiled worker isn't present
 * (dev/tests), where behaviour is identical.
 */
export function runScriptIsolated(
  input: RunScriptRequest,
  proxyBase: string,
): Promise<RunScriptResult> {
  const workerUrl = new URL('./sandbox-worker.js', import.meta.url);
  if (!existsSync(fileURLToPath(workerUrl))) {
    return runScript(input, proxyBase);
  }

  const timeoutMs = input.timeoutMs ?? 2000;
  return new Promise<RunScriptResult>((resolve) => {
    const worker = new Worker(workerUrl, {
      workerData: { input, proxyBase },
      resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 },
    });
    let settled = false;
    const finish = (r: RunScriptResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      resolve(r);
    };
    const timer = setTimeout(() => finish(emptyResult('Script worker timed out')), timeoutMs + 12_000);
    worker.once('message', (r: RunScriptResult) => finish(r));
    worker.once('error', (e) => finish(emptyResult(e instanceof Error ? e.message : String(e))));
  });
}
