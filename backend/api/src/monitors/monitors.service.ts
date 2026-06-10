import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Monitor } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { RunsService } from '../runs/runs.service';
import { QuotaService } from '../quota/quota.service';
import type { CreateMonitorDto, UpdateMonitorDto } from './monitors.schemas';

export const MONITORS_QUEUE = 'monitors';

@Injectable()
export class MonitorsService {
  private readonly logger = new Logger(MonitorsService.name);

  constructor(
    @InjectQueue(MONITORS_QUEUE) private readonly queue: Queue,
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly runs: RunsService,
    private readonly quota: QuotaService,
  ) {}

  async list(userId: string, workspaceId: string) {
    await this.tenancy.assertWorkspaceAccess(userId, workspaceId);
    return this.prisma.monitor.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });
  }

  async create(userId: string, dto: CreateMonitorDto) {
    const { collection } = await this.tenancy.assertCollectionAccess(userId, dto.collectionId, 'EDITOR');
    await this.quota.assertCanCreate(collection.workspace.teamId, 'monitors');
    const monitor = await this.prisma.monitor.create({
      data: {
        collectionId: collection.id,
        workspaceId: collection.workspaceId,
        userId,
        environmentId: dto.environmentId ?? null,
        name: dto.name ?? `${collection.name} Monitor`,
        intervalMinutes: dto.intervalMinutes,
        webhookUrl: dto.webhookUrl ?? null,
      },
    });
    // The job scheduler fires its first iteration immediately, then every interval.
    await this.schedule(monitor);
    return monitor;
  }

  async update(userId: string, id: string, dto: UpdateMonitorDto) {
    const existing = await this.getOwned(userId, id);
    const monitor = await this.prisma.monitor.update({
      where: { id },
      data: {
        name: dto.name,
        intervalMinutes: dto.intervalMinutes,
        enabled: dto.enabled,
        environmentId: dto.environmentId,
        webhookUrl: dto.webhookUrl,
      },
    });
    if (monitor.enabled) await this.schedule(monitor);
    else await this.unschedule(monitor.id);
    return monitor;
  }

  async remove(userId: string, id: string) {
    const monitor = await this.getOwned(userId, id);
    await this.unschedule(monitor.id);
    await this.prisma.monitor.delete({ where: { id } });
    return { ok: true };
  }

  async history(userId: string, id: string) {
    const monitor = await this.getOwned(userId, id);
    return this.prisma.collectionRun.findMany({
      where: { monitorId: monitor.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        status: true,
        passed: true,
        failed: true,
        totalRequests: true,
        createdAt: true,
        finishedAt: true,
      },
    });
  }

  /** Worker tick: run the monitored collection and stamp lastRunAt. */
  async tick(monitorId: string): Promise<void> {
    const monitor = await this.prisma.monitor.findUnique({ where: { id: monitorId } });
    if (!monitor || !monitor.enabled) return;
    await this.runs.runCollection({
      collectionId: monitor.collectionId,
      workspaceId: monitor.workspaceId,
      userId: monitor.userId,
      environmentId: monitor.environmentId,
      iterations: 1,
      monitorId: monitor.id,
    });
    await this.prisma.monitor.update({ where: { id: monitorId }, data: { lastRunAt: new Date() } });
  }

  private async schedule(monitor: Monitor) {
    await this.queue.upsertJobScheduler(
      monitor.id,
      { every: monitor.intervalMinutes * 60_000 },
      { name: 'tick', data: { monitorId: monitor.id } },
    );
  }

  private async unschedule(monitorId: string) {
    await this.queue.removeJobScheduler(monitorId).catch(() => undefined);
  }

  private async getOwned(userId: string, id: string) {
    const monitor = await this.prisma.monitor.findUnique({ where: { id } });
    if (!monitor) throw new NotFoundException('Monitor not found');
    await this.tenancy.assertWorkspaceAccess(userId, monitor.workspaceId, 'EDITOR');
    return monitor;
  }
}
