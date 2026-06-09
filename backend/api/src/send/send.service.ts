import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import type { ProxyError, ProxyResponse, RequestDefinition, Variable } from '@rocket/types';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly crypto: CryptoService,
  ) {}

  /**
   * Resolve a request (variable interpolation across collection + environment
   * scopes), execute it via the proxy, persist history, and return the response.
   */
  async send(userId: string, dto: SendRequestDto) {
    await this.tenancy.assertWorkspaceAccess(userId, dto.workspaceId);

    const vars = await this.gatherVariables(userId, dto);
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
      return { ok: false as const, error: payload as ProxyError };
    }

    const response = payload as ProxyResponse;
    const history = await this.prisma.requestHistory.create({
      data: {
        userId,
        workspaceId: dto.workspaceId,
        request: dto.request as unknown as Prisma.InputJsonValue,
        responseMeta: {
          status: response.status,
          timeMs: response.timeMs,
          sizeBytes: response.sizeBytes,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return { ok: true as const, response, historyId: history.id };
  }

  /** Collect variable scopes (collection < environment) with secrets decrypted. */
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
