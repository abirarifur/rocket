import { z } from 'zod';
import { RequestDefinitionSchema } from '@rocket/types';

export const SendRequestSchema = z.object({
  workspaceId: z.string().min(1),
  request: RequestDefinitionSchema,
});
export type SendRequestDto = z.infer<typeof SendRequestSchema>;
