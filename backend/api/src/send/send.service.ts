import { Injectable } from '@nestjs/common';
import type { RequestAuth, Variable } from '@rocket/types';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { CryptoService } from '../crypto/crypto.service';
import { ExecutionService } from '../execution/execution.service';
import { resolveVariableMap } from './interpolate';
import type { SendRequestDto } from './send.schemas';

@Injectable()
export class SendService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly crypto: CryptoService,
    private readonly execution: ExecutionService,
  ) {}

  async send(userId: string, dto: SendRequestDto) {
    await this.tenancy.assertWorkspaceAccess(userId, dto.workspaceId);

    const vars = await this.gatherVariables(userId, dto);
    const inheritedAuth = await this.collectionAuth(userId, dto);
    const result = await this.execution.executeOne(dto.request, vars, inheritedAuth);

    // Persist any environment-scoped variables written by scripts.
    await this.persistEnvUpdates(userId, dto.environmentId, result.setEnv);

    if (!result.ok) {
      return { ok: false as const, error: result.error, logs: result.logs, scriptError: result.scriptError };
    }

    const response = result.response!;
    const history = await this.prisma.requestHistory.create({
      data: {
        userId,
        workspaceId: dto.workspaceId,
        request: dto.request as unknown as Prisma.InputJsonValue,
        responseMeta: {
          status: response.status,
          timeMs: response.timeMs,
          sizeBytes: response.sizeBytes,
          tests: result.tests.length,
          testsPassed: result.tests.filter((t) => t.passed).length,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return {
      ok: true as const,
      response,
      historyId: history.id,
      tests: result.tests,
      logs: result.logs,
      scriptError: result.scriptError,
    };
  }

  /** Persist script-set variables into the active environment (chaining). */
  async persistEnvUpdates(
    userId: string,
    environmentId: string | null | undefined,
    setEnv: Record<string, string>,
  ): Promise<void> {
    const keys = Object.keys(setEnv);
    if (!environmentId || keys.length === 0) return;
    const { environment } = await this.tenancy.assertEnvironmentAccess(userId, environmentId, 'EDITOR');
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

  /** Resolved variable map: global (team) < collection < environment. */
  async gatherVariables(userId: string, dto: SendRequestDto): Promise<Record<string, string>> {
    const { workspace } = await this.tenancy.assertWorkspaceAccess(userId, dto.workspaceId);
    const team = await this.prisma.team.findUnique({ where: { id: workspace.teamId } });
    const globalVars = this.decrypt((team?.globals as Variable[] | undefined) ?? []);

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
    return resolveVariableMap(globalVars, collectionVars, environmentVars);
  }

  /** The collection's auth, used only when the request inherits (avoids a fetch otherwise). */
  async collectionAuth(userId: string, dto: SendRequestDto): Promise<RequestAuth | null> {
    if (dto.request.auth?.type !== 'inherit' || !dto.collectionId) return null;
    const { collection } = await this.tenancy.assertCollectionAccess(userId, dto.collectionId);
    return (collection.auth as RequestAuth | null) ?? null;
  }

  decrypt(vars: Variable[]): Variable[] {
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
