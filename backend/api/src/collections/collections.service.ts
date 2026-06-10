import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { QuotaService } from '../quota/quota.service';
import type { CreateCollectionDto, UpdateCollectionDto } from './collections.schemas';

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly events: EventEmitter2,
    private readonly quota: QuotaService,
  ) {}

  async create(userId: string, workspaceId: string, dto: CreateCollectionDto) {
    const { workspace } = await this.tenancy.assertWorkspaceAccess(userId, workspaceId, 'EDITOR');
    await this.quota.assertCanCreate(workspace.teamId, 'collections');
    return this.prisma.collection.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
        tree: [],
        variables: [],
      },
    });
  }

  async get(userId: string, collectionId: string) {
    const { collection } = await this.tenancy.assertCollectionAccess(userId, collectionId);
    return collection;
  }

  async update(userId: string, collectionId: string, dto: UpdateCollectionDto) {
    const { collection } = await this.tenancy.assertCollectionAccess(userId, collectionId, 'EDITOR');
    const data: Prisma.CollectionUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.tree !== undefined) data.tree = dto.tree as unknown as Prisma.InputJsonValue;
    if (dto.variables !== undefined) {
      data.variables = dto.variables as unknown as Prisma.InputJsonValue;
    }
    const updated = await this.prisma.collection.update({ where: { id: collectionId }, data });
    // Notify collaborators in the workspace so their views refresh live.
    this.events.emit('collection.updated', {
      workspaceId: collection.workspaceId,
      collectionId,
      byUserId: userId,
    });
    return updated;
  }

  async remove(userId: string, collectionId: string) {
    await this.tenancy.assertCollectionAccess(userId, collectionId, 'EDITOR');
    await this.prisma.collection.delete({ where: { id: collectionId } });
    return { ok: true };
  }

  /** Copy a collection (tree + variables) into a target workspace, recording the fork link. */
  async fork(userId: string, collectionId: string, targetWorkspaceId: string, name?: string) {
    const { collection } = await this.tenancy.assertCollectionAccess(userId, collectionId);
    await this.tenancy.assertWorkspaceAccess(userId, targetWorkspaceId, 'EDITOR');
    return this.prisma.collection.create({
      data: {
        workspaceId: targetWorkspaceId,
        name: name ?? `${collection.name} (fork)`,
        description: collection.description,
        tree: collection.tree as Prisma.InputJsonValue,
        variables: collection.variables as Prisma.InputJsonValue,
        forkOfId: collection.id,
      },
    });
  }
}
