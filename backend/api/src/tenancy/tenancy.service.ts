import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Central access-control checks. Every workspace/collection access goes through
 * here so tenant isolation is enforced in one place. Fine-grained RBAC roles
 * (Editor vs Viewer) land in Phase 4; for now membership = access.
 */
@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the workspace if the user's team owns it, else throws. */
  async assertWorkspaceAccess(userId: string, workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace not found');
    await this.assertTeamMember(userId, workspace.teamId);
    return workspace;
  }

  /** Returns the collection (with workspace) if the user may access it, else throws. */
  async assertCollectionAccess(userId: string, collectionId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: { workspace: true },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    await this.assertTeamMember(userId, collection.workspace.teamId);
    return collection;
  }

  /** Returns the environment (with workspace) if the user may access it, else throws. */
  async assertEnvironmentAccess(userId: string, environmentId: string) {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: { workspace: true },
    });
    if (!environment) throw new NotFoundException('Environment not found');
    await this.assertTeamMember(userId, environment.workspace.teamId);
    return environment;
  }

  private async assertTeamMember(userId: string, teamId: string) {
    const membership = await this.prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!membership) throw new ForbiddenException('No access to this resource');
    return membership;
  }
}
