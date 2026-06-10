import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { TenancyService, ROLE_RANK } from '../tenancy/tenancy.service';
import type { CreateCommentDto } from './comments.schemas';

const shape = (c: {
  id: string;
  collectionId: string;
  requestNodeId: string | null;
  parentId: string | null;
  body: string;
  createdAt: Date;
  user: { id: string; email: string; name: string | null };
}) => ({
  id: c.id,
  collectionId: c.collectionId,
  requestNodeId: c.requestNodeId,
  parentId: c.parentId,
  body: c.body,
  createdAt: c.createdAt,
  author: { id: c.user.id, email: c.user.email, name: c.user.name },
});

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenancy: TenancyService,
    private readonly events: EventEmitter2,
  ) {}

  async list(userId: string, collectionId: string) {
    await this.tenancy.assertCollectionAccess(userId, collectionId);
    const rows = await this.prisma.comment.findMany({
      where: { collectionId },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    return rows.map(shape);
  }

  async create(userId: string, collectionId: string, dto: CreateCommentDto) {
    const { collection } = await this.tenancy.assertCollectionAccess(userId, collectionId);
    const row = await this.prisma.comment.create({
      data: {
        workspaceId: collection.workspaceId,
        collectionId,
        requestNodeId: dto.requestNodeId ?? null,
        parentId: dto.parentId ?? null,
        userId,
        body: dto.body,
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    const comment = shape(row);
    this.events.emit('comment.created', {
      workspaceId: collection.workspaceId,
      collectionId,
      comment,
    });
    return comment;
  }

  async remove(userId: string, commentId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');
    const { role } = await this.tenancy.assertCollectionAccess(userId, comment.collectionId);
    // Author can delete their own; admins can delete any.
    if (comment.userId !== userId && ROLE_RANK[role] < ROLE_RANK.ADMIN) {
      throw new ForbiddenException('Cannot delete this comment');
    }
    await this.prisma.comment.delete({ where: { id: commentId } });
    return { ok: true };
  }
}
