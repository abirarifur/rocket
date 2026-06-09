import { z } from 'zod';

/**
 * Authentication configuration for a request. MVP supports the most common
 * schemes; OAuth flows, AWS Sig, etc. arrive in later phases.
 */
export const AuthTypeSchema = z.enum([
  'none',
  'inherit', // inherit from parent folder/collection
  'basic',
  'bearer',
  'apikey',
]);
export type AuthType = z.infer<typeof AuthTypeSchema>;

export const ApiKeyLocationSchema = z.enum(['header', 'query']);
export type ApiKeyLocation = z.infer<typeof ApiKeyLocationSchema>;

export const RequestAuthSchema = z.object({
  type: AuthTypeSchema.default('inherit'),
  basic: z
    .object({
      username: z.string().default(''),
      password: z.string().default(''),
    })
    .optional(),
  bearer: z
    .object({
      token: z.string().default(''),
    })
    .optional(),
  apikey: z
    .object({
      key: z.string().default(''),
      value: z.string().default(''),
      in: ApiKeyLocationSchema.default('header'),
    })
    .optional(),
});
export type RequestAuth = z.infer<typeof RequestAuthSchema>;
