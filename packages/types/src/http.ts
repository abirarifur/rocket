import { z } from 'zod';

/** Supported HTTP methods for request building. */
export const HttpMethodSchema = z.enum([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

/** A single key/value pair (header, query param, form field) with an enabled toggle. */
export const KeyValueSchema = z.object({
  key: z.string(),
  value: z.string().default(''),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
});
export type KeyValue = z.infer<typeof KeyValueSchema>;

/** Request body modes mirror Postman's body types. */
export const BodyModeSchema = z.enum([
  'none',
  'raw',
  'form-data',
  'urlencoded',
  'binary',
  'graphql',
]);
export type BodyMode = z.infer<typeof BodyModeSchema>;

/** Language hint for the raw body editor (drives syntax highlighting + Content-Type). */
export const RawLanguageSchema = z.enum(['text', 'json', 'xml', 'html', 'javascript']);
export type RawLanguage = z.infer<typeof RawLanguageSchema>;

export const FormFieldSchema = KeyValueSchema.extend({
  /** form-data fields may carry a file reference instead of a text value. */
  type: z.enum(['text', 'file']).default('text'),
  /** Object-storage key when type === 'file'. */
  fileRef: z.string().optional(),
});
export type FormField = z.infer<typeof FormFieldSchema>;

export const RequestBodySchema = z.object({
  mode: BodyModeSchema.default('none'),
  raw: z.string().optional(),
  rawLanguage: RawLanguageSchema.optional(),
  formData: z.array(FormFieldSchema).optional(),
  urlencoded: z.array(KeyValueSchema).optional(),
  /** Object-storage key for binary uploads. */
  binaryRef: z.string().optional(),
  graphql: z
    .object({
      query: z.string().default(''),
      variables: z.string().optional(),
    })
    .optional(),
});
export type RequestBody = z.infer<typeof RequestBodySchema>;
