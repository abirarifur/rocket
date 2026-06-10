import { z } from 'zod';

export const CreateMonitorSchema = z.object({
  collectionId: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
  intervalMinutes: z.number().int().min(1).max(1440).default(60),
  environmentId: z.string().min(1).nullish(),
  webhookUrl: z.string().url().nullish(),
});
export type CreateMonitorDto = z.infer<typeof CreateMonitorSchema>;

export const UpdateMonitorSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    intervalMinutes: z.number().int().min(1).max(1440).optional(),
    enabled: z.boolean().optional(),
    environmentId: z.string().min(1).nullish(),
    webhookUrl: z.string().url().nullish(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });
export type UpdateMonitorDto = z.infer<typeof UpdateMonitorSchema>;
