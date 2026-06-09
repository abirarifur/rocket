import { z } from 'zod';
import { RequestDefinitionSchema } from './request.js';
import { ProxyResponseSchema } from './proxy.js';

/** Which lifecycle hook a script runs in. */
export const ScriptPhaseSchema = z.enum(['pre', 'test']);
export type ScriptPhase = z.infer<typeof ScriptPhaseSchema>;

/** Request sent to the Script Runner service. */
export const RunScriptRequestSchema = z.object({
  phase: ScriptPhaseSchema,
  script: z.string(),
  /** The request definition (pre: about to be sent; test: what was sent). */
  request: RequestDefinitionSchema,
  /** Present in the test phase. */
  response: ProxyResponseSchema.optional(),
  /** Currently resolved variable map available to the script. */
  variables: z.record(z.string(), z.string()).default({}),
  /** Per-run timeout for the sandbox. */
  timeoutMs: z.number().int().positive().max(10_000).optional(),
});
export type RunScriptRequest = z.infer<typeof RunScriptRequestSchema>;

export const ScriptTestResultSchema = z.object({
  name: z.string(),
  passed: z.boolean(),
  error: z.string().optional(),
});
export type ScriptTestResult = z.infer<typeof ScriptTestResultSchema>;

export const RunScriptResultSchema = z.object({
  tests: z.array(ScriptTestResultSchema).default([]),
  logs: z.array(z.string()).default([]),
  /** Variables the script wrote to environment scope (persisted by the API). */
  setEnv: z.record(z.string(), z.string()).default({}),
  /** Variables written to local/run scope (used for this run's interpolation only). */
  setLocal: z.record(z.string(), z.string()).default({}),
  /** Top-level script error (syntax/runtime/timeout), if any. */
  error: z.string().optional(),
});
export type RunScriptResult = z.infer<typeof RunScriptResultSchema>;
