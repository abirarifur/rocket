import { z } from 'zod';

/**
 * Authentication configuration for a request. The dropdown mirrors Postman's full
 * list; signing is implemented server-side for the schemes that can be computed in
 * a single pass (basic, bearer, api key, JWT, OAuth 1.0, OAuth 2.0 token, AWS
 * Signature v4, Hawk). Schemes that require a challenge round-trip or interactive
 * token grant (digest, NTLM, Akamai EdgeGrid, ASAP) are accepted and stored so the
 * UI is complete, but are not yet applied to the outgoing request.
 */
export const AuthTypeSchema = z.enum([
  'none',
  'inherit', // inherit from parent folder/collection
  'basic',
  'bearer',
  'jwt',
  'digest',
  'oauth1',
  'oauth2',
  'hawk',
  'awsv4',
  'ntlm',
  'apikey',
  'edgegrid',
  'asap',
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
  /** JWT Bearer: sign claims with HMAC (HS*) or an RSA private key (RS*). */
  jwt: z
    .object({
      algorithm: z.enum(['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512']).default('HS256'),
      secret: z.string().default(''), // HMAC secret, or RSA private key (PEM) for RS*
      isSecretBase64: z.boolean().default(false),
      payload: z.string().default('{}'), // JSON claims
      headerPrefix: z.string().default('Bearer'),
      addTo: ApiKeyLocationSchema.default('header'),
      headerName: z.string().default('Authorization'),
      queryParamKey: z.string().default('token'),
    })
    .optional(),
  /** OAuth 2.0: paste an existing access token (full grant flows are out of scope). */
  oauth2: z
    .object({
      accessToken: z.string().default(''),
      headerPrefix: z.string().default('Bearer'),
      addTo: ApiKeyLocationSchema.default('header'),
      queryParamKey: z.string().default('access_token'),
    })
    .optional(),
  /** OAuth 1.0: one-legged/three-legged HMAC or PLAINTEXT signing. */
  oauth1: z
    .object({
      consumerKey: z.string().default(''),
      consumerSecret: z.string().default(''),
      token: z.string().default(''),
      tokenSecret: z.string().default(''),
      signatureMethod: z.enum(['HMAC-SHA1', 'HMAC-SHA256', 'PLAINTEXT']).default('HMAC-SHA1'),
      addTo: ApiKeyLocationSchema.default('header'),
      realm: z.string().default(''),
    })
    .optional(),
  /** AWS Signature v4. */
  awsv4: z
    .object({
      accessKey: z.string().default(''),
      secretKey: z.string().default(''),
      region: z.string().default('us-east-1'),
      service: z.string().default(''),
      sessionToken: z.string().default(''),
    })
    .optional(),
  /** Hawk authentication (MAC over request). */
  hawk: z
    .object({
      authId: z.string().default(''),
      authKey: z.string().default(''),
      algorithm: z.enum(['sha256', 'sha1']).default('sha256'),
      user: z.string().default(''),
      nonce: z.string().default(''),
      extData: z.string().default(''),
      app: z.string().default(''),
      dlg: z.string().default(''),
    })
    .optional(),
  /** Digest Auth — stored but requires a 401 challenge round-trip to apply. */
  digest: z
    .object({
      username: z.string().default(''),
      password: z.string().default(''),
      realm: z.string().default(''),
      nonce: z.string().default(''),
      algorithm: z.enum(['MD5', 'MD5-sess', 'SHA-256']).default('MD5'),
      qop: z.string().default(''),
      nonceCount: z.string().default(''),
      clientNonce: z.string().default(''),
      opaque: z.string().default(''),
    })
    .optional(),
  /** NTLM — stored but requires a multi-step handshake to apply. */
  ntlm: z
    .object({
      username: z.string().default(''),
      password: z.string().default(''),
      domain: z.string().default(''),
      workstation: z.string().default(''),
    })
    .optional(),
  /** Akamai EdgeGrid — stored; signing not yet applied. */
  edgegrid: z
    .object({
      accessToken: z.string().default(''),
      clientToken: z.string().default(''),
      clientSecret: z.string().default(''),
      headersToSign: z.string().default(''),
    })
    .optional(),
  /** ASAP (Atlassian) — stored; signing not yet applied. */
  asap: z
    .object({
      issuer: z.string().default(''),
      audience: z.string().default(''),
      keyId: z.string().default(''),
      privateKey: z.string().default(''),
      subject: z.string().default(''),
      algorithm: z.enum(['RS256', 'HS256']).default('RS256'),
    })
    .optional(),
});
export type RequestAuth = z.infer<typeof RequestAuthSchema>;
