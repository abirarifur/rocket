import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import type { CreateCollectionDto, UpdateCollectionDto } from './collections.schemas';

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  async create(userId: string, workspaceId: string, dto: CreateCollectionDto) {
    await this.tenancy.assertWorkspaceAccess(userId, workspaceId);
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
    return this.tenancy.assertCollectionAccess(userId, collectionId);
  }

  async update(userId: string, collectionId: string, dto: UpdateCollectionDto) {
    await this.tenancy.assertCollectionAccess(userId, collectionId);
    const data: Prisma.CollectionUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.tree !== undefined) data.tree = dto.tree as unknown as Prisma.InputJsonValue;
    if (dto.variables !== undefined) {
      data.variables = dto.variables as unknown as Prisma.InputJsonValue;
    }
    return this.prisma.collection.update({ where: { id: collectionId }, data });
  }

  async remove(userId: string, collectionId: string) {
    await this.tenancy.assertCollectionAccess(userId, collectionId);
    await this.prisma.collection.delete({ where: { id: collectionId } });
    return { ok: true };
  }
}
