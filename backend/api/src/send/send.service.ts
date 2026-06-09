import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import type { ProxyError, ProxyResponse, RequestDefinition } from '@rocket/types';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { resolveRequest } from './resolve-request';

@Injectable()
export class SendService {
  private readonly logger = new Logger(SendService.name);
  private readonly proxyBase = process.env.PROXY_BASE_URL ?? 'http://localhost:4100';

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  /**
   * Resolve and execute a request via the proxy service, persist it to history,
   * and return the proxy response.
   */
  async send(userId: string, workspaceId: string, def: RequestDefinition) {
    await this.tenancy.assertWorkspaceAccess(userId, workspaceId);
    const proxyReq = resolveRequest(def);

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
      // Surface the proxy's structured error (e.g. BLOCKED_SSRF) to the client.
      return { ok: false as const, error: payload as ProxyError };
    }

    const response = payload as ProxyResponse;
    const history = await this.prisma.requestHistory.create({
      data: {
        userId,
        workspaceId,
        request: def as unknown as Prisma.InputJsonValue,
        responseMeta: {
          status: response.status,
          timeMs: response.timeMs,
          sizeBytes: response.sizeBytes,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return { ok: true as const, response, historyId: history.id };
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
