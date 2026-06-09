import { z } from 'zod';

/** Variable scopes, listed from lowest to highest precedence when resolving. */
export const VariableScopeSchema = z.enum([
  'global', // team-wide
  'collection',
  'environment',
  'local', // set at runtime by scripts (highest precedence)
]);
export type VariableScope = z.infer<typeof VariableScopeSchema>;

export const VariableSchema = z.object({
  key: z.string(),
  value: z.string().default(''),
  enabled: z.boolean().default(true),
  /** Secret values are masked in the UI and encrypted at rest. */
  secret: z.boolean().default(false),
});
export type Variable = z.infer<typeof VariableSchema>;

export const EnvironmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  variables: z.array(VariableSchema).default([]),
});
export type Environment = z.infer<typeof EnvironmentSchema>;

/**
 * Postman variable resolution precedence (highest wins):
 *   local > environment > collection > global
 */
export const SCOPE_PRECEDENCE: VariableScope[] = ['global', 'collection', 'environment', 'local'];
