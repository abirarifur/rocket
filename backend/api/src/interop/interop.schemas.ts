import { z } from 'zod';

export const ImportSchema = z.object({
  type: z.enum(['postman', 'openapi', 'har']),
  content: z.string().min(1),
});
export type ImportDto = z.infer<typeof ImportSchema>;

export const CurlImportSchema = z.object({ command: z.string().min(1) });
export type CurlImportDto = z.infer<typeof CurlImportSchema>;
