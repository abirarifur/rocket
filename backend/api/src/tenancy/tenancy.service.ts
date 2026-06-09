import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { TeamRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/** Role hierarchy: higher rank implies all lower permissions. */
export const ROLE_RANK: Record<TeamRole, number> = {
  VIEWER: 0,
  EDITOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

/**
 * Central access-control. Every resource access goes through here so tenant
 * isolation AND role checks live in one place. Pass a `minRole` to require a
 * permission level (defaults to VIEWER = any member).
 */
@Injectable()
export class TenancyService {
  constructor(private readonly prisma: PrismaService) {}

  async assertTeamRole(userId: string, teamId: string, minRole: TeamRole = 'VIEWER') {
    const membership = await this.prisma.teamMembership.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!membership) throw new ForbiddenException('No access to this resource');
    if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) {
      throw new ForbiddenException(`Requires ${minRole.toLowerCase()} role or higher`);
    }
    return membership.role;
  }

  async assertWorkspaceAccess(userId: string, workspaceId: string, minRole: TeamRole = 'VIEWER') {
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } });
    if (!workspace) throw new NotFoundException('Workspace not found');
    const role = await this.assertTeamRole(userId, workspace.teamId, minRole);
    return { workspace, role };
  }

  async assertCollectionAccess(userId: string, collectionId: string, minRole: TeamRole = 'VIEWER') {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: { workspace: true },
    });
    if (!collection) throw new NotFoundException('Collection not found');
    const role = await this.assertTeamRole(userId, collection.workspace.teamId, minRole);
    return { collection, role };
  }

  async assertEnvironmentAccess(userId: string, environmentId: string, minRole: TeamRole = 'VIEWER') {
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: { workspace: true },
    });
    if (!environment) throw new NotFoundException('Environment not found');
    const role = await this.assertTeamRole(userId, environment.workspace.teamId, minRole);
    return { environment, role };
  }
}
