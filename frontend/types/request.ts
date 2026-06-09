import { z } from 'zod';
import { HttpMethodSchema, KeyValueSchema, RequestBodySchema } from './http.js';
import { RequestAuthSchema } from './auth.js';

/**
 * The portable definition of an HTTP request. This is the unit stored in
 * collections and sent (after variable interpolation) to the proxy service.
 */
export const RequestDefinitionSchema = z.object({
  name: z.string().default('Untitled Request'),
  method: HttpMethodSchema.default('GET'),
  url: z.string().default(''),
  /** Query params kept separate from the URL string for structured editing. */
  params: z.array(KeyValueSchema).default([]),
  headers: z.array(KeyValueSchema).default([]),
  body: RequestBodySchema.default({ mode: 'none' }),
  auth: RequestAuthSchema.default({ type: 'inherit' }),
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
