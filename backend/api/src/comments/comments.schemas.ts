import { z } from 'zod';

export const CreateCommentSchema = z.object({
  body: z.string().min(1).max(4000),
  requestNodeId: z.string().min(1).nullish(),
  parentId: z.string().min(1).nullish(),
});
export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;
