import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CollectionNode } from '@rocket/types';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService } from '../tenancy/tenancy.service';
import { QuotaService } from '../quota/quota.service';
import type { CreateMockDto, MockRoute, UpdateMockDto } from './mocks.schemas';

@Injectable()
export class MocksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly quota: QuotaService,
  ) {}

  async list(userId: string, workspaceId: string) {
    await this.tenancy.assertWorkspaceAccess(userId, workspaceId);
    return this.prisma.mockServer.findMany({ where: { workspaceId }, orderBy: { createdAt: 'desc' } });
  }

  /** Create a mock server, seeding routes from the collection's requests. */
  async create(userId: string, dto: CreateMockDto) {
    const { collection } = await this.tenancy.assertCollectionAccess(userId, dto.collectionId, 'EDITOR');
    await this.quota.assertCanCreate(collection.workspace.teamId, 'mocks');
    const routes = deriveRoutes(collection.tree as unknown as CollectionNode[]);
    return this.prisma.mockServer.create({
      data: {
        collectionId: collection.id,
        workspaceId: collection.workspaceId,
        name: dto.name ?? `${collection.name} Mock`,
        routes: routes as unknown as Prisma.InputJsonValue,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateMockDto) {
    const mock = await this.getOwned(userId, id, 'EDITOR');
    const data: Prisma.MockServerUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.routes !== undefined) data.routes = dto.routes as unknown as Prisma.InputJsonValue;
    return this.prisma.mockServer.update({ where: { id: mock.id }, data });
  }

  async remove(userId: string, id: string) {
    const mock = await this.getOwned(userId, id, 'EDITOR');
    await this.prisma.mockServer.delete({ where: { id: mock.id } });
    return { ok: true };
  }

  /** Public matcher used by the mock-serving endpoint (no auth). */
  async match(mockId: string, method: string, path: string): Promise<MockRoute | null> {
    const mock = await this.prisma.mockServer.findUnique({ where: { id: mockId } });
    if (!mock || !mock.enabled) return null;
    const routes = mock.routes as unknown as MockRoute[];
    const want = normalize(path);
    const candidates = routes.filter((r) => r.method.toUpperCase() === method.toUpperCase());
    // Prefer an exact match, then fall back to pattern routes (:param / *).
    return (
      candidates.find((r) => normalize(r.path) === want) ??
      candidates.find((r) => pathPattern(normalize(r.path)).test(want)) ??
      null
    );
  }

  private async getOwned(userId: string, id: string, minRole: 'EDITOR' | 'VIEWER') {
    const mock = await this.prisma.mockServer.findUnique({ where: { id } });
    if (!mock) throw new NotFoundException('Mock not found');
    await this.tenancy.assertWorkspaceAccess(userId, mock.workspaceId, minRole);
    return mock;
  }
}

function normalize(p: string): string {
  let s = p.split('?')[0] ?? '/';
  if (!s.startsWith('/')) s = '/' + s;
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

/** Compile a route path with :param / * placeholders into a matcher regex. */
function pathPattern(routePath: string): RegExp {
  const body = routePath
    .split('/')
    .map((seg) => {
      if (seg.startsWith(':')) return '[^/]+'; // :id matches one segment
      if (seg === '*') return '.*'; // wildcard matches the rest
      return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp(`^${body}$`);
}

/** Turn a collection tree into mock routes (method + path from each request URL). */
function deriveRoutes(tree: CollectionNode[]): MockRoute[] {
  const routes: MockRoute[] = [];
  const walk = (nodes: CollectionNode[]) => {
    for (const node of nodes) {
      if (node.type === 'folder') walk(node.children);
      else {
        routes.push({
          method: node.request.method,
          path: extractPath(node.request.url),
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ message: `Mock response for ${node.request.name}` }),
        });
      }
    }
  };
  walk(tree);
  return routes;
}

/** Best-effort path extraction from a request URL (handles {{vars}} hosts). */
function extractPath(url: string): string {
  const cleaned = url.replace(/\{\{[^}]+\}\}/g, '');
  try {
    if (/^https?:\/\//i.test(cleaned)) return normalize(new URL(cleaned).pathname);
  } catch {
    /* fall through */
  }
  const slash = cleaned.indexOf('/', cleaned.startsWith('//') ? 2 : 0);
  return slash === -1 ? '/' : normalize(cleaned.slice(slash));
}
