import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { TenancyService } from '../tenancy/tenancy.service';
import { PresenceService } from './presence.service';

interface AuthedSocket extends Socket {
  data: { userId?: string; email?: string; name?: string | null };
}

/** Real-time collaboration: presence + live update fan-out over socket.io. */
@WebSocketGateway({
  cors: { origin: process.env.WEB_ORIGIN ?? 'http://localhost:3001', credentials: true },
})
export class CollabGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CollabGateway.name);
  @WebSocketServer() server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly tenancy: TenancyService,
    private readonly presence: PresenceService,
  ) {}

  async handleConnection(client: AuthedSocket): Promise<void> {
    const token = parseCookies(client.handshake.headers.cookie)['rocket_at'];
    if (!token) return void client.disconnect();
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; email: string }>(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      client.data.userId = payload.sub;
      client.data.email = payload.email;
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthedSocket): void {
    for (const wsId of this.presence.remove(client.id)) this.broadcastPresence(wsId);
  }

  @SubscribeMessage('join')
  async join(client: AuthedSocket, payload: { workspaceId: string }): Promise<void> {
    if (!client.data.userId) return;
    try {
      await this.tenancy.assertWorkspaceAccess(client.data.userId, payload.workspaceId);
    } catch {
      return; // not a member — ignore
    }
    await client.join(room(payload.workspaceId));
    this.presence.add(payload.workspaceId, client.id, {
      userId: client.data.userId,
      email: client.data.email ?? '',
      name: client.data.name ?? null,
      viewing: null,
    });
    this.broadcastPresence(payload.workspaceId);
  }

  @SubscribeMessage('view')
  view(client: AuthedSocket, payload: { workspaceId: string; collectionId: string | null }): void {
    this.presence.setViewing(client.id, payload.collectionId);
    this.broadcastPresence(payload.workspaceId);
  }

  @SubscribeMessage('leave')
  async leave(client: AuthedSocket, payload: { workspaceId: string }): Promise<void> {
    await client.leave(room(payload.workspaceId));
    this.presence.removeFromWorkspace(payload.workspaceId, client.id);
    this.broadcastPresence(payload.workspaceId);
  }

  private broadcastPresence(workspaceId: string): void {
    this.server.to(room(workspaceId)).emit('presence', this.presence.list(workspaceId));
  }

  // ── Server-side events fanned out to the workspace room ──

  @OnEvent('collection.updated')
  onCollectionUpdated(e: { workspaceId: string; collectionId: string; byUserId: string }): void {
    this.server.to(room(e.workspaceId)).emit('collection:updated', {
      collectionId: e.collectionId,
      byUserId: e.byUserId,
    });
  }

  @OnEvent('comment.created')
  onCommentCreated(e: { workspaceId: string; collectionId: string; comment: unknown }): void {
    this.server
      .to(room(e.workspaceId))
      .emit('comment:created', { collectionId: e.collectionId, comment: e.comment });
  }
}

const room = (workspaceId: string) => `ws:${workspaceId}`;

function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}
