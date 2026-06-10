import { Injectable } from '@nestjs/common';

export interface PresenceEntry {
  userId: string;
  email: string;
  name: string | null;
  viewing: string | null; // collectionId being viewed
}

/**
 * In-memory presence registry (who is connected to which workspace and what
 * they're viewing). Single-instance for the MVP; multi-instance presence would
 * use the socket.io Redis adapter + a shared store.
 */
@Injectable()
export class PresenceService {
  private readonly byWorkspace = new Map<string, Map<string, PresenceEntry>>();
  private readonly socketWorkspaces = new Map<string, Set<string>>();

  add(workspaceId: string, socketId: string, entry: PresenceEntry): void {
    if (!this.byWorkspace.has(workspaceId)) this.byWorkspace.set(workspaceId, new Map());
    this.byWorkspace.get(workspaceId)!.set(socketId, entry);
    if (!this.socketWorkspaces.has(socketId)) this.socketWorkspaces.set(socketId, new Set());
    this.socketWorkspaces.get(socketId)!.add(workspaceId);
  }

  setViewing(socketId: string, viewing: string | null): void {
    for (const wsId of this.socketWorkspaces.get(socketId) ?? []) {
      const entry = this.byWorkspace.get(wsId)?.get(socketId);
      if (entry) entry.viewing = viewing;
    }
  }

  removeFromWorkspace(workspaceId: string, socketId: string): void {
    this.byWorkspace.get(workspaceId)?.delete(socketId);
    this.socketWorkspaces.get(socketId)?.delete(workspaceId);
  }

  /** Remove a socket entirely; returns the workspaces it was present in. */
  remove(socketId: string): string[] {
    const workspaces = [...(this.socketWorkspaces.get(socketId) ?? [])];
    for (const wsId of workspaces) this.byWorkspace.get(wsId)?.delete(socketId);
    this.socketWorkspaces.delete(socketId);
    return workspaces;
  }

  /** Unique online users in a workspace (deduped across a user's sockets). */
  list(workspaceId: string): PresenceEntry[] {
    const byUser = new Map<string, PresenceEntry>();
    for (const entry of this.byWorkspace.get(workspaceId)?.values() ?? []) {
      byUser.set(entry.userId, entry);
    }
    return [...byUser.values()];
  }
}
