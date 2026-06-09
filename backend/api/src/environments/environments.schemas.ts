import { z } from 'zod';
import { VariableSchema } from '@rocket/types';

export const CreateEnvironmentSchema = z.object({
  name: z.string().min(1).max(120),
  variables: z.array(VariableSchema).default([]),
});
export type CreateEnvironmentDto = z.infer<typeof CreateEnvironmentSchema>;

export const UpdateEnvironmentSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    variables: z.array(VariableSchema).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });
export type UpdateEnvironmentDto = z.infer<typeof UpdateEnvironmentSchema>;
