import { z } from 'zod';
import { CollectionNodeSchema, VariableSchema } from '@rocket/types';

export const CreateCollectionSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
});
export type CreateCollectionDto = z.infer<typeof CreateCollectionSchema>;

/** Partial update; the tree/variables are replaced wholesale when provided. */
export const UpdateCollectionSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(2000).optional(),
    tree: z.array(CollectionNodeSchema).optional(),
    variables: z.array(VariableSchema).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });
export type UpdateCollectionDto = z.infer<typeof UpdateCollectionSchema>;
