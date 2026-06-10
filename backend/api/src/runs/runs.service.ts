import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { RunStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import type { CollectionNode, RequestAuth, RequestDefinition, Variable } from '@rocket/types';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { CryptoService } from '../crypto/crypto.service';
import { ExecutionService } from '../execution/execution.service';
import { resolveVariableMap } from '../send/interpolate';
import { parseDataRows, type RunCollectionDto } from './runs.schemas';

export const RUNS_QUEUE = 'collection-runs';

interface RequestEntry {
  name: string;
  request: RequestDefinition;
}

@Injectable()
export class RunsService {
  private readonly logger = new Logger(RunsService.name);

  constructor(
    @InjectQueue(RUNS_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly crypto: CryptoService,
    private readonly execution: ExecutionService,
  ) {}

  /** Create a run record and enqueue the background job (user-initiated). */
  async enqueue(userId: string, collectionId: string, dto: RunCollectionDto) {
    const { collection } = await this.tenancy.assertCollectionAccess(userId, collectionId);
    const rows = parseDataRows(dto.data);
    const iterations = rows.length > 0 ? rows.length : dto.iterations;
    return this.runCollection({
      collectionId,
      workspaceId: collection.workspaceId,
      userId,
      environmentId: dto.environmentId ?? null,
      iterations,
      data: dto.data ?? null,
    });
  }

  /** Internal: create the run record + enqueue the job (also used by monitors). */
  async runCollection(opts: {
    collectionId: string;
    workspaceId: string;
    userId: string;
    environmentId?: string | null;
    iterations: number;
    data?: { type: 'json' | 'csv'; content: string } | null;
    monitorId?: string | null;
  }) {
    const run = await this.prisma.collectionRun.create({
      data: {
        collectionId: opts.collectionId,
        workspaceId: opts.workspaceId,
        userId: opts.userId,
        environmentId: opts.environmentId ?? null,
        monitorId: opts.monitorId ?? null,
        status: RunStatus.QUEUED,
        iterations: opts.iterations,
      },
    });
    await this.queue.add(
      'run',
      { runId: run.id, data: opts.data ?? null },
      { removeOnComplete: 100, removeOnFail: 100 },
    );
    return run;
  }

  async getRun(userId: string, runId: string) {
    const run = await this.prisma.collectionRun.findUnique({ where: { id: runId } });
    if (!run) return null;
    await this.tenancy.assertWorkspaceAccess(userId, run.workspaceId);
    return run;
  }

  async listRuns(userId: string, collectionId: string) {
    await this.tenancy.assertCollectionAccess(userId, collectionId);
    return this.prisma.collectionRun.findMany({
      where: { collectionId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        iterations: true,
        totalRequests: true,
        passed: true,
        failed: true,
        createdAt: true,
        finishedAt: true,
      },
    });
  }

  /** Background job body: execute the collection and write the aggregated report. */
  async process(runId: string, data: { type: 'json' | 'csv'; content: string } | null): Promise<void> {
    const run = await this.prisma.collectionRun.findUnique({ where: { id: runId } });
    if (!run) return;

    await this.prisma.collectionRun.update({
      where: { id: runId },
      data: { status: RunStatus.RUNNING, startedAt: new Date() },
    });

    try {
      const collection = await this.prisma.collection.findUniqueOrThrow({ where: { id: run.collectionId } });
      const requests = flatten(collection.tree as unknown as CollectionNode[]);
      const collectionVars = this.decrypt(collection.variables as unknown as Variable[]);
      const collectionAuth = (collection.auth as RequestAuth | null) ?? null;

      const workspace = await this.prisma.workspace.findUnique({ where: { id: run.workspaceId } });
      const team = workspace
        ? await this.prisma.team.findUnique({ where: { id: workspace.teamId } })
        : null;
      const globalVars = this.decrypt((team?.globals as unknown as Variable[] | undefined) ?? []);

      let environmentVars: Variable[] = [];
      if (run.environmentId) {
        const env = await this.prisma.environment.findUnique({ where: { id: run.environmentId } });
        if (env) environmentVars = this.decrypt(env.variables as unknown as Variable[]);
      }

      const rows = parseDataRows(data);
      const iterations = rows.length > 0 ? rows.length : run.iterations;
      const baseMap = resolveVariableMap(globalVars, collectionVars, environmentVars);

      const report: unknown[] = [];
      let passed = 0;
      let failed = 0;

      for (let i = 0; i < iterations; i++) {
        const dataRow = rows[i] ?? {};
        // Per-iteration runtime map; thread script-set vars across requests.
        const runtime: Record<string, string> = { ...baseMap, ...dataRow };
        const iterationResults: unknown[] = [];

        for (const entry of requests) {
          const result = await this.execution.executeOne(entry.request, runtime, collectionAuth);
          Object.assign(runtime, result.setLocal, result.setEnv);

          const reqPassed = result.tests.filter((t) => t.passed).length;
          const reqFailed = result.tests.filter((t) => !t.passed).length;
          passed += reqPassed;
          failed += reqFailed;
          // A request that couldn't even be sent counts as a failure.
          const ok = result.ok && !result.scriptError;
          if (!result.ok) failed += 1;

          iterationResults.push({
            name: entry.name,
            ok,
            status: result.response?.status ?? null,
            timeMs: result.response ? Math.round(result.response.timeMs) : null,
            error: result.error?.error ?? result.scriptError ?? null,
            tests: result.tests,
          });
        }
        report.push({ iteration: i + 1, requests: iterationResults });
      }

      await this.prisma.collectionRun.update({
        where: { id: runId },
        data: {
          status: RunStatus.COMPLETED,
          finishedAt: new Date(),
          totalRequests: requests.length * iterations,
          passed,
          failed,
          report: report as unknown as Prisma.InputJsonValue,
        },
      });

      // Monitor alerting hook: notify a webhook when a scheduled run has failures.
      if (run.monitorId && failed > 0) {
        await this.fireMonitorWebhook(run.monitorId, runId, passed, failed);
      }
    } catch (e) {
      this.logger.error(`run ${runId} failed: ${e instanceof Error ? e.message : e}`);
      await this.prisma.collectionRun.update({
        where: { id: runId },
        data: {
          status: RunStatus.FAILED,
          finishedAt: new Date(),
          error: e instanceof Error ? e.message : String(e),
        },
      });
    }
  }

  private async fireMonitorWebhook(monitorId: string, runId: string, passed: number, failed: number) {
    const monitor = await this.prisma.monitor.findUnique({ where: { id: monitorId } });
    if (!monitor?.webhookUrl) return;
    try {
      await fetch(monitor.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monitor: monitor.name,
          runId,
          passed,
          failed,
          status: 'failures detected',
        }),
      });
    } catch (e) {
      this.logger.warn(`monitor webhook failed: ${e instanceof Error ? e.message : e}`);
    }
  }

  private decrypt(vars: Variable[]): Variable[] {
    return vars.map((v) => (v.secret && v.value ? { ...v, value: this.crypto.decrypt(v.value) } : v));
  }
}

/** Depth-first flatten of the collection tree into an ordered request list. */
function flatten(nodes: CollectionNode[]): RequestEntry[] {
  const out: RequestEntry[] = [];
  const walk = (list: CollectionNode[]) => {
    for (const node of [...list].sort((a, b) => a.order - b.order)) {
      if (node.type === 'request') out.push({ name: node.request.name, request: node.request });
      else walk(node.children);
    }
  };
  walk(nodes);
  return out;
}
