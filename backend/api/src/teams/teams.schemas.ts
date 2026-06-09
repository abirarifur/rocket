import { z } from 'zod';

// Members can be assigned any role except OWNER (ownership transfer is separate).
const AssignableRole = z.enum(['ADMIN', 'EDITOR', 'VIEWER']);

export const InviteSchema = z.object({
  email: z.string().email(),
  role: AssignableRole.default('VIEWER'),
});
export type InviteDto = z.infer<typeof InviteSchema>;

export const AcceptInviteSchema = z.object({ token: z.string().min(1) });
export type AcceptInviteDto = z.infer<typeof AcceptInviteSchema>;

export const ChangeRoleSchema = z.object({ role: AssignableRole });
export type ChangeRoleDto = z.infer<typeof ChangeRoleSchema>;

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(120),
  visibility: z.enum(['TEAM', 'PERSONAL']).default('TEAM'),
});
export type CreateWorkspaceDto = z.infer<typeof CreateWorkspaceSchema>;

export const UpdateWorkspaceSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    visibility: z.enum(['PERSONAL', 'TEAM', 'PUBLIC']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update' });
export type UpdateWorkspaceDto = z.infer<typeof UpdateWorkspaceSchema>;

export const ForkCollectionSchema = z.object({
  workspaceId: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
});
export type ForkCollectionDto = z.infer<typeof ForkCollectionSchema>;
