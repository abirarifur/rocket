import { Injectable, NotFoundException } from '@nestjs/common';
import { WorkspaceVisibility } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { CreateWorkspaceDto, UpdateWorkspaceDto } from '../teams/teams.schemas';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  /** Create a workspace inside a team (ADMIN+). */
  async create(userId: string, teamId: string, dto: CreateWorkspaceDto) {
    await this.tenancy.assertTeamRole(userId, teamId, 'ADMIN');
    return this.prisma.workspace.create({
      data: { teamId, name: dto.name, visibility: dto.visibility as WorkspaceVisibility },
    });
  }

  /** Rename / change visibility (ADMIN+). */
  async update(userId: string, workspaceId: string, dto: UpdateWorkspaceDto) {
    await this.tenancy.assertWorkspaceAccess(userId, workspaceId, 'ADMIN');
    const data: Prisma.WorkspaceUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.visibility !== undefined) data.visibility = dto.visibility as WorkspaceVisibility;
    return this.prisma.workspace.update({ where: { id: workspaceId }, data });
  }

  /** Public, unauthenticated read of a PUBLIC workspace + its collections. */
  async getPublic(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace || workspace.visibility !== WorkspaceVisibility.PUBLIC) {
      throw new NotFoundException('Public workspace not found');
    }
    const collections = await this.prisma.collection.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, description: true, tree: true },
    });
    return { id: workspace.id, name: workspace.name, collections };
  }

  /** Public, read-only documentation view for a collection in a PUBLIC workspace. */
  async getPublicCollectionDocs(collectionId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: { workspace: true },
    });
    if (!collection || collection.workspace.visibility !== WorkspaceVisibility.PUBLIC) {
      throw new NotFoundException('Public collection not found');
    }
    // Mask secret variable values.
    const variables = (collection.variables as { key: string; value: string; secret?: boolean }[]).map(
      (v) => (v.secret ? { ...v, value: '••••••' } : v),
    );
    return {
      id: collection.id,
      name: collection.name,
      description: collection.description,
      variables,
      tree: collection.tree,
    };
  }

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
    const { workspace } = await this.tenancy.assertWorkspaceAccess(userId, workspaceId);
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
