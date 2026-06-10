import { z } from 'zod';

export const MockRouteSchema = z.object({
  method: z.string().default('GET'),
  path: z.string().default('/'),
  status: z.number().int().min(100).max(599).default(200),
  contentType: z.string().default('application/json'),
  body: z.string().default(''),
  headers: z.record(z.string(), z.string()).optional(),
});
export type MockRoute = z.infer<typeof MockRouteSchema>;

export const CreateMockSchema = z.object({
  collectionId: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
});
export type CreateMockDto = z.infer<typeof CreateMockSchema>;

export const UpdateMockSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    enabled: z.boolean().optional(),
    routes: z.array(MockRouteSchema).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });
export type UpdateMockDto = z.infer<typeof UpdateMockSchema>;
