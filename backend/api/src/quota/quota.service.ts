import { ForbiddenException, Injectable } from '@nestjs/common';
import { Plan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type QuotaResource = 'collections' | 'environments' | 'monitors' | 'mocks' | 'members';

/** Per-plan resource limits (per team). Infinity = unlimited. */
export const PLAN_LIMITS: Record<Plan, Record<QuotaResource, number>> = {
  FREE: { collections: 10, environments: 5, monitors: 2, mocks: 2, members: 3 },
  PRO: { collections: 100, environments: 50, monitors: 25, mocks: 25, members: 25 },
  ENTERPRISE: {
    collections: Infinity,
    environments: Infinity,
    monitors: Infinity,
    mocks: Infinity,
    members: Infinity,
  },
};

@Injectable()
export class QuotaService {
  constructor(private readonly prisma: PrismaService) {}

  /** Throw if creating another `resource` would exceed the team's plan limit. */
  async assertCanCreate(teamId: string, resource: QuotaResource): Promise<void> {
    const team = await this.prisma.team.findUniqueOrThrow({ where: { id: teamId } });
    const limit = PLAN_LIMITS[team.plan][resource];
    if (limit === Infinity) return;
    const used = await this.count(teamId, resource);
    if (used >= limit) {
      throw new ForbiddenException(
        `Plan limit reached: ${resource} (${used}/${limit} on the ${team.plan} plan). Upgrade to add more.`,
      );
    }
  }

  async usage(teamId: string): Promise<{ plan: Plan; limits: Record<QuotaResource, number>; usage: Record<QuotaResource, number> }> {
    const team = await this.prisma.team.findUniqueOrThrow({ where: { id: teamId } });
    const resources: QuotaResource[] = ['collections', 'environments', 'monitors', 'mocks', 'members'];
    const usage = {} as Record<QuotaResource, number>;
    for (const r of resources) usage[r] = await this.count(teamId, r);
    return { plan: team.plan, limits: PLAN_LIMITS[team.plan], usage };
  }

  private async count(teamId: string, resource: QuotaResource): Promise<number> {
    if (resource === 'members') {
      return this.prisma.teamMembership.count({ where: { teamId } });
    }
    const workspaces = await this.prisma.workspace.findMany({ where: { teamId }, select: { id: true } });
    const inWs = { workspaceId: { in: workspaces.map((w) => w.id) } };
    switch (resource) {
      case 'collections':
        return this.prisma.collection.count({ where: inWs });
      case 'environments':
        return this.prisma.environment.count({ where: inWs });
      case 'monitors':
        return this.prisma.monitor.count({ where: inWs });
      case 'mocks':
        return this.prisma.mockServer.count({ where: inWs });
    }
  }
}
