import { z } from 'zod';
import { RequestDefinitionSchema } from '@rocket/types';

export const SendRequestSchema = z.object({
  workspaceId: z.string().min(1),
  request: RequestDefinitionSchema,
  /** Optional scopes for {{variable}} interpolation. */
  environmentId: z.string().min(1).nullish(),
  collectionId: z.string().min(1).nullish(),
});
export type SendRequestDto = z.infer<typeof SendRequestSchema>;
