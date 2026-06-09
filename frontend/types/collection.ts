import { z } from 'zod';
import { RequestDefinitionSchema } from './request.js';
import { VariableSchema } from './environment.js';

/**
 * Internal collection tree. Folders nest arbitrarily; requests are leaves.
 * Kept structurally close to Postman Collection Format v2.1 so import/export
 * (Phase 7) is lossless.
 */
export interface FolderNode {
  id: string;
  type: 'folder';
  name: string;
  description?: string;
  order: number;
  children: CollectionNode[];
}

export interface RequestNode {
  id: string;
  type: 'request';
  order: number;
  request: z.infer<typeof RequestDefinitionSchema>;
}

export type CollectionNode = FolderNode | RequestNode;

export const RequestNodeSchema: z.ZodType<RequestNode, z.ZodTypeDef, unknown> = z.object({
  id: z.string(),
  type: z.literal('request'),
  order: z.number().int().default(0),
  request: RequestDefinitionSchema,
});

export const FolderNodeSchema: z.ZodType<FolderNode, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: z.literal('folder'),
    name: z.string(),
    description: z.string().optional(),
    order: z.number().int().default(0),
    children: z.array(CollectionNodeSchema),
  }),
);

export const CollectionNodeSchema: z.ZodType<CollectionNode, z.ZodTypeDef, unknown> = z.lazy(() =>
  z.union([FolderNodeSchema, RequestNodeSchema]),
);

export const CollectionSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  variables: z.array(VariableSchema).default([]),
  tree: z.array(CollectionNodeSchema).default([]),
  forkOfId: z.string().nullable().default(null),
});
export type Collection = z.infer<typeof CollectionSchema>;
