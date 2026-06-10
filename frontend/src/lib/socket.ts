'use client';

import { io, type Socket } from 'socket.io-client';
import { API_BASE } from './api';

let socket: Socket | null = null;

/** Lazily-created singleton socket.io connection (cookies sent via withCredentials). */
export function getSocket(): Socket {
  if (!socket) {
    // Default transports (polling then upgrade to websocket) — most robust
    // across proxies/port-mappings; a forced websocket-only transport can hang.
    socket = io(API_BASE, { withCredentials: true, autoConnect: true });
  }
  return socket;
}

export interface PresenceEntry {
  userId: string;
  email: string;
  name: string | null;
  viewing: string | null;
}
