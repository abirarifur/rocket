import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import type {
  ProxyError,
  ProxyResponse,
  RequestDefinition,
  RunScriptRequest,
  RunScriptResult,
  ScriptTestResult,
} from '@rocket/types';
import { resolveRequest } from '../send/resolve-request';
import { interpolateRequest } from '../send/interpolate';

export interface ExecutionResult {
  ok: boolean;
  response?: ProxyResponse;
  error?: ProxyError;
  tests: ScriptTestResult[];
  logs: string[];
  setEnv: Record<string, string>;
  setLocal: Record<string, string>;
  scriptError?: string;
}

/**
 * Executes a single request: pre-request script -> variable interpolation ->
 * proxy -> test script. Shared by the one-off /send path and the collection
 * runner so behaviour is identical. Variable writes are returned, not persisted
 * here — the caller decides.
 */
@Injectable()
export class ExecutionService {
  private readonly logger = new Logger(ExecutionService.name);
  private readonly proxyBase = process.env.PROXY_BASE_URL ?? 'http://localhost:4100';
  private readonly runnerBase = process.env.RUNNER_BASE_URL ?? 'http://localhost:4200';

  async executeOne(request: RequestDefinition, vars: Record<string, string>): Promise<ExecutionResult> {
    const working = { ...vars };
    const setEnv: Record<string, string> = {};
    const setLocal: Record<string, string> = {};
    const tests: ScriptTestResult[] = [];
    const logs: string[] = [];
    let scriptError: string | undefined;

    if (request.preRequestScript?.trim()) {
      const pre = await this.runScript({ phase: 'pre', script: request.preRequestScript, request, variables: working });
      Object.assign(working, pre.setLocal, pre.setEnv);
      Object.assign(setLocal, pre.setLocal);
      Object.assign(setEnv, pre.setEnv);
      logs.push(...pre.logs);
      if (pre.error) scriptError = `Pre-request: ${pre.error}`;
    }

    const interpolated = interpolateRequest(request, working);
    const proxyReq = resolveRequest(interpolated);

    let res: Response;
    try {
      res = await fetch(`${this.proxyBase}/proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proxyReq),
      });
    } catch (e) {
      this.logger.error(`proxy unreachable: ${e instanceof Error ? e.message : e}`);
      throw new BadGatewayException('Proxy service unreachable');
    }

    const payload = (await res.json()) as ProxyResponse | ProxyError;
    if (!res.ok || 'code' in payload) {
      return { ok: false, error: payload as ProxyError, tests, logs, setEnv, setLocal, scriptError };
    }

    const response = payload as ProxyResponse;

    if (request.testScript?.trim()) {
      const result = await this.runScript({
        phase: 'test',
        script: request.testScript,
        request: interpolated,
        response,
        variables: working,
      });
      Object.assign(working, result.setLocal, result.setEnv);
      Object.assign(setLocal, result.setLocal);
      Object.assign(setEnv, result.setEnv);
      tests.push(...result.tests);
      logs.push(...result.logs);
      if (result.error) scriptError = `Tests: ${result.error}`;
    }

    return { ok: true, response, tests, logs, setEnv, setLocal, scriptError };
  }

  private async runScript(body: RunScriptRequest): Promise<RunScriptResult> {
    try {
      const res = await fetch(`${this.runnerBase}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return { tests: [], logs: [], setEnv: {}, setLocal: {}, error: `runner ${res.status}` };
      return (await res.json()) as RunScriptResult;
    } catch (e) {
      return {
        tests: [],
        logs: [],
        setEnv: {},
        setLocal: {},
        error: `runner unreachable: ${e instanceof Error ? e.message : e}`,
      };
    }
  }
}
