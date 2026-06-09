import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  /** All workspaces across teams the user belongs to. */
  async listForUser(userId: string) {
    const memberships = await this.prisma.teamMembership.findMany({
      where: { userId },
      include: { team: { include: { workspaces: { orderBy: { createdAt: 'asc' } } } } },
    });
    return memberships.flatMap((m) =>
      m.team.workspaces.map((w) => ({
        id: w.id,
        name: w.name,
        visibility: w.visibility,
        teamId: m.teamId,
        teamName: m.team.name,
        role: m.role,
      })),
    );
  }

  /** Workspace detail with collection summaries. */
  async getWithCollections(userId: string, workspaceId: string) {
    const workspace = await this.tenancy.assertWorkspaceAccess(userId, workspaceId);
    const collections = await this.prisma.collection.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, description: true, updatedAt: true },
    });
    return {
      id: workspace.id,
      name: workspace.name,
      visibility: workspace.visibility,
      collections,
    };
  }
}
