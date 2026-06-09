import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Variable } from '@rocket/types';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { fromPostman, toPostman, type InternalCollection } from './postman';
import { fromOpenApi } from './openapi';
import { fromHar } from './har';
import { parseCurl } from './curl';

export type ImportType = 'postman' | 'openapi' | 'har';

@Injectable()
export class InteropService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
  ) {}

  /** Parse an external document and create a collection in the workspace. */
  async importCollection(userId: string, workspaceId: string, type: ImportType, content: string) {
    await this.tenancy.assertWorkspaceAccess(userId, workspaceId, 'EDITOR');

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadRequestException('Content is not valid JSON');
    }

    let internal: InternalCollection;
    try {
      if (type === 'postman') internal = fromPostman(parsed as Parameters<typeof fromPostman>[0]);
      else if (type === 'openapi') internal = fromOpenApi(parsed as Parameters<typeof fromOpenApi>[0]);
      else internal = fromHar(parsed as Parameters<typeof fromHar>[0]);
    } catch (e) {
      throw new BadRequestException(`Could not parse ${type}: ${e instanceof Error ? e.message : e}`);
    }

    return this.prisma.collection.create({
      data: {
        workspaceId,
        name: internal.name,
        description: internal.description,
        variables: internal.variables as unknown as Prisma.InputJsonValue,
        tree: internal.tree as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /** Export a collection as Postman Collection Format v2.1. */
  async exportCollection(userId: string, collectionId: string) {
    const { collection } = await this.tenancy.assertCollectionAccess(userId, collectionId);
    const internal: InternalCollection = {
      name: collection.name,
      description: collection.description ?? undefined,
      variables: collection.variables as unknown as Variable[],
      tree: collection.tree as unknown as InternalCollection['tree'],
    };
    return toPostman(internal);
  }

  parseCurl(content: string) {
    if (!content.trim()) throw new BadRequestException('Empty cURL command');
    return parseCurl(content);
  }
}
