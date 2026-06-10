import { parentPort, workerData } from 'node:worker_threads';
import type { RunScriptRequest } from '@rocket/types';
import { runScript } from './sandbox.js';

// Worker entry: runs the sandboxed script in an isolated thread with memory
// limits (set by the spawner), so a memory bomb or runaway script is contained
// and hard-killable without affecting the runner's event loop.
const { input, proxyBase } = workerData as { input: RunScriptRequest; proxyBase: string };

runScript(input, proxyBase)
  .then((result) => parentPort?.postMessage(result))
  .catch((e) =>
    parentPort?.postMessage({
      tests: [],
      logs: [],
      setEnv: {},
      setLocal: {},
      error: e instanceof Error ? e.message : String(e),
    }),
  );
