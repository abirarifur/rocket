import { z } from 'zod';
import { HttpMethodSchema, KeyValueSchema, RequestBodySchema } from './http.js';
import { RequestAuthSchema } from './auth.js';

/**
 * The protocol a request speaks. `http` and `graphql` are sent through the proxy
 * as HTTP; `websocket` and `socketio` are long-lived connections opened directly
 * by the browser client (the connection panel, not the /send proxy).
 */
export const RequestKindSchema = z.enum(['http', 'graphql', 'websocket', 'socketio']);
export type RequestKind = z.infer<typeof RequestKindSchema>;

/** Saved configuration for a Socket.IO connection request. */
export const SocketIoConfigSchema = z.object({
  /** Event name used by the emit composer. */
  event: z.string().default('message'),
  /** JSON (or text) payload for the emit composer. */
  message: z.string().default(''),
  /** Event names to subscribe to and surface in the message log. */
  listeners: z.array(z.string()).default([]),
  /** socket.io transport path. */
  path: z.string().default('/socket.io'),
});
export type SocketIoConfig = z.infer<typeof SocketIoConfigSchema>;

/**
 * The portable definition of a request. This is the unit stored in collections
 * and (for http/graphql) sent — after variable interpolation — to the proxy.
 */
export const RequestDefinitionSchema = z.object({
  name: z.string().default('Untitled Request'),
  /** Protocol/editor this request uses; defaults to a plain HTTP request. */
  kind: RequestKindSchema.default('http'),
  method: HttpMethodSchema.default('GET'),
  url: z.string().default(''),
  /** Query params kept separate from the URL string for structured editing. */
  params: z.array(KeyValueSchema).default([]),
  headers: z.array(KeyValueSchema).default([]),
  body: RequestBodySchema.default({ mode: 'none' }),
  auth: RequestAuthSchema.default({ type: 'inherit' }),
  /** Settings for a Socket.IO request (only used when kind === 'socketio'). */
  socketio: SocketIoConfigSchema.optional(),
  description: z.string().optional(),
  /** Reserved for Phase 5 scripting. */
  preRequestScript: z.string().optional(),
  testScript: z.string().optional(),
});
export type RequestDefinition = z.infer<typeof RequestDefinitionSchema>;

/** Factory for a blank request, used by the UI when creating a new tab. */
export function emptyRequest(): RequestDefinition {
  return RequestDefinitionSchema.parse({});
}
