import { z } from 'zod';
import { HttpMethodSchema } from './http.js';

/**
 * Contract for the Request Proxy service. The client sends a fully-resolved
 * request (variables already interpolated, body serialized) and the proxy
 * performs the outbound call server-side, sidestepping browser CORS.
 */
export const ProxyRequestSchema = z.object({
  method: HttpMethodSchema,
  url: z.string().url(),
  headers: z.record(z.string(), z.string()).default({}),
  /** Pre-serialized body (string) or null. Binary handled via objectKey later. */
  body: z.string().nullable().default(null),
  timeoutMs: z.number().int().positive().max(120_000).optional(),
  /** Follow 3xx redirects (default true). */
  followRedirects: z.boolean().default(true),
});
export type ProxyRequest = z.infer<typeof ProxyRequestSchema>;

export const ProxyResponseSchema = z.object({
  status: z.number().int(),
  statusText: z.string(),
  headers: z.record(z.string(), z.string()),
  /** Response body as text; large bodies are truncated and flagged. */
  body: z.string(),
  truncated: z.boolean().default(false),
  /** Total round-trip time in milliseconds, measured server-side. */
  timeMs: z.number(),
  /** Response size in bytes (before any truncation). */
  sizeBytes: z.number().int(),
});
export type ProxyResponse = z.infer<typeof ProxyResponseSchema>;

/** Shape returned when the proxy refuses or fails a request. */
export const ProxyErrorSchema = z.object({
  error: z.string(),
  code: z.enum([
    'BLOCKED_SSRF',
    'INVALID_URL',
    'TIMEOUT',
    'TOO_LARGE',
    'CONNECTION_FAILED',
    'UNKNOWN',
  ]),
});
export type ProxyError = z.infer<typeof ProxyErrorSchema>;
