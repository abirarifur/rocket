import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import type {
  ProxyError,
  ProxyResponse,
  RequestDefinition,
  RunScriptRequest,
  RunScriptResult,
  Variable,
} from '@rocket/types';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { CryptoService } from '../crypto/crypto.service';
import { resolveRequest } from './resolve-request';
import { interpolateRequest, resolveVariableMap } from './interpolate';
import type { SendRequestDto } from './send.schemas';

@Injectable()
export class SendService {
  private readonly logger = new Logger(SendService.name);
  private readonly proxyBase = process.env.PROXY_BASE_URL ?? 'http://localhost:4100';
  private readonly runnerBase = process.env.RUNNER_BASE_URL ?? 'http://localhost:4200';

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly crypto: CryptoService,
  ) {}

  async send(userId: string, dto: SendRequestDto) {
    await this.tenancy.assertWorkspaceAccess(userId, dto.workspaceId);

    const vars = await this.gatherVariables(userId, dto);
    const logs: string[] = [];
    const tests: RunScriptResult['tests'] = [];
    let scriptError: string | undefined;

    // ── Pre-request script: may set variables used for interpolation ──
    if (dto.request.preRequestScript?.trim()) {
      const pre = await this.runScript({
        phase: 'pre',
        script: dto.request.preRequestScript,
        request: dto.request,
        variables: vars,
      });
      Object.assign(vars, pre.setLocal, pre.setEnv);
      logs.push(...pre.logs);
      if (pre.error) scriptError = `Pre-request: ${pre.error}`;
      await this.persistEnvUpdates(userId, dto.environmentId, pre.setEnv);
    }

    const interpolated = interpolateRequest(dto.request, vars);
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
      return { ok: false as const, error: payload as ProxyError, logs, scriptError };
    }

    const response = payload as ProxyResponse;

    // ── Test script: assertions against the response ──
    if (dto.request.testScript?.trim()) {
      const result = await this.runScript({
        phase: 'test',
        script: dto.request.testScript,
        request: interpolated,
        response,
        variables: vars,
      });
      tests.push(...result.tests);
      logs.push(...result.logs);
      if (result.error) scriptError = `Tests: ${result.error}`;
      await this.persistEnvUpdates(userId, dto.environmentId, result.setEnv);
    }

    const history = await this.prisma.requestHistory.create({
      data: {
        userId,
        workspaceId: dto.workspaceId,
        request: dto.request as unknown as Prisma.InputJsonValue,
        responseMeta: {
          status: response.status,
          timeMs: response.timeMs,
          sizeBytes: response.sizeBytes,
          tests: tests.length,
          testsPassed: tests.filter((t) => t.passed).length,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return { ok: true as const, response, historyId: history.id, tests, logs, scriptError };
  }

  /** Call the sandboxed Script Runner service. Failures degrade gracefully. */
  private async runScript(body: RunScriptRequest): Promise<RunScriptResult> {
    try {
      const res = await fetch(`${this.runnerBase}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) return emptyResult(`runner returned ${res.status}`);
      return (await res.json()) as RunScriptResult;
    } catch (e) {
      return emptyResult(`runner unreachable: ${e instanceof Error ? e.message : e}`);
    }
  }

  /** Persist script-set variables into the active environment (chaining). */
  private async persistEnvUpdates(
    userId: string,
    environmentId: string | null | undefined,
    setEnv: Record<string, string>,
  ): Promise<void> {
    const keys = Object.keys(setEnv);
    if (!environmentId || keys.length === 0) return;
    const { environment } = await this.tenancy.assertEnvironmentAccess(
      userId,
      environmentId,
      'EDITOR',
    );
    const current = environment.variables as Variable[];
    const byKey = new Map(current.map((v) => [v.key, v]));
    for (const k of keys) {
      const existing = byKey.get(k);
      const secret = existing?.secret ?? false;
      const value = secret ? this.crypto.encrypt(setEnv[k]!) : setEnv[k]!;
      byKey.set(k, { key: k, value, enabled: existing?.enabled ?? true, secret });
    }
    await this.prisma.environment.update({
      where: { id: environmentId },
      data: { variables: [...byKey.values()] as unknown as Prisma.InputJsonValue },
    });
  }

  private async gatherVariables(userId: string, dto: SendRequestDto): Promise<Record<string, string>> {
    let collectionVars: Variable[] = [];
    let environmentVars: Variable[] = [];

    if (dto.collectionId) {
      const { collection } = await this.tenancy.assertCollectionAccess(userId, dto.collectionId);
      collectionVars = this.decrypt(collection.variables as Variable[]);
    }
    if (dto.environmentId) {
      const { environment } = await this.tenancy.assertEnvironmentAccess(userId, dto.environmentId);
      environmentVars = this.decrypt(environment.variables as Variable[]);
    }
    return resolveVariableMap(collectionVars, environmentVars);
  }

  private decrypt(vars: Variable[]): Variable[] {
    return vars.map((v) => (v.secret && v.value ? { ...v, value: this.crypto.decrypt(v.value) } : v));
  }

  async history(userId: string, workspaceId: string) {
    await this.tenancy.assertWorkspaceAccess(userId, workspaceId);
    return this.prisma.requestHistory.findMany({
      where: { workspaceId, userId },
      orderBy: { executedAt: 'desc' },
      take: 50,
    });
  }
}

function emptyResult(error: string): RunScriptResult {
  return { tests: [], logs: [], setEnv: {}, setLocal: {}, error };
}
