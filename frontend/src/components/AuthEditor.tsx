'use client';

import type { RequestAuth } from '@rocket/types';

const input: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.5rem 0.6rem',
  fontSize: '0.9rem',
  width: '100%',
};

/** Auth types in the same order Postman lists them in the Authorization dropdown. */
const AUTH_OPTIONS: { value: RequestAuth['type']; label: string }[] = [
  { value: 'inherit', label: 'Inherit auth from parent' },
  { value: 'none', label: 'No Auth' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'jwt', label: 'JWT Bearer' },
  { value: 'digest', label: 'Digest Auth' },
  { value: 'oauth1', label: 'OAuth 1.0' },
  { value: 'oauth2', label: 'OAuth 2.0' },
  { value: 'hawk', label: 'Hawk Authentication' },
  { value: 'awsv4', label: 'AWS Signature' },
  { value: 'ntlm', label: 'NTLM Authentication' },
  { value: 'apikey', label: 'API Key' },
  { value: 'edgegrid', label: 'Akamai EdgeGrid' },
  { value: 'asap', label: 'ASAP (Atlassian)' },
];

/** Schemes accepted by the UI but not yet applied to the request (need a round-trip). */
const NOT_YET_APPLIED = new Set<RequestAuth['type']>(['digest', 'ntlm', 'edgegrid', 'asap']);

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
      <span style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>{label}</span>
      {children}
    </label>
  );
}

interface Props {
  auth: RequestAuth;
  onChange: (auth: RequestAuth) => void;
  disabled?: boolean;
  /** When false, the Inherit option is hidden (e.g. collection-level auth). */
  allowInherit?: boolean;
}

/**
 * Full Authorization editor shared by the request builder and collection settings.
 * Renders the type dropdown plus the right fields for the selected scheme.
 */
export function AuthEditor({ auth, onChange, disabled, allowInherit = true }: Props) {
  const t = auth.type;
  // Loosely-typed setter for a config block: merges a partial into auth[block].
  const upd = (block: string, partial: Record<string, unknown>) =>
    onChange({
      ...auth,
      [block]: { ...((auth as Record<string, unknown>)[block] as object | undefined), ...partial },
    } as RequestAuth);
  const get = (block: string): Record<string, unknown> =>
    ((auth as Record<string, unknown>)[block] as Record<string, unknown>) ?? {};

  const text = (block: string, key: string, label: string, type: 'text' | 'password' = 'text') => (
    <Field label={label}>
      <input
        style={input}
        type={type}
        disabled={disabled}
        value={(get(block)[key] as string) ?? ''}
        onChange={(e) => upd(block, { [key]: e.target.value })}
      />
    </Field>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxWidth: 480 }}>
      <Field label="Auth Type">
        <select
          value={t}
          disabled={disabled}
          onChange={(e) => onChange({ ...auth, type: e.target.value as RequestAuth['type'] })}
          style={input}
        >
          {AUTH_OPTIONS.filter((o) => allowInherit || o.value !== 'inherit').map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      {t === 'inherit' && (
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.6 }}>
          This request uses the authorization configured on its collection (open the collection&apos;s
          <strong> Authorization</strong> tab to set it). Choose another type above to override it here.
        </p>
      )}
      {t === 'none' && (
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
          This request does not use any authorization.
        </p>
      )}

      {NOT_YET_APPLIED.has(t) && (
        <p
          style={{
            color: 'var(--accent)',
            background: 'rgba(255,107,53,0.1)',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            padding: '0.45rem 0.6rem',
            borderRadius: 6,
          }}
        >
          Settings are saved, but this scheme needs a challenge/handshake that isn&apos;t applied to
          the outgoing request yet.
        </p>
      )}

      {t === 'basic' && (
        <>
          {text('basic', 'username', 'Username')}
          {text('basic', 'password', 'Password', 'password')}
        </>
      )}

      {t === 'bearer' && text('bearer', 'token', 'Token')}

      {t === 'jwt' && (
        <>
          <Field label="Algorithm">
            <select
              style={input}
              disabled={disabled}
              value={(get('jwt').algorithm as string) ?? 'HS256'}
              onChange={(e) => upd('jwt', { algorithm: e.target.value })}
            >
              {['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512'].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>
          {text('jwt', 'secret', 'Secret / Private Key (PEM for RS*)')}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--muted)' }}>
            <input
              type="checkbox"
              disabled={disabled}
              checked={Boolean(get('jwt').isSecretBase64)}
              onChange={(e) => upd('jwt', { isSecretBase64: e.target.checked })}
            />
            Secret is Base64 encoded
          </label>
          <Field label="Payload (JSON claims)">
            <textarea
              style={{ ...input, minHeight: 90, fontFamily: 'ui-monospace, monospace' }}
              disabled={disabled}
              value={(get('jwt').payload as string) ?? '{}'}
              onChange={(e) => upd('jwt', { payload: e.target.value })}
              placeholder='{ "sub": "1234567890", "name": "Jane" }'
            />
          </Field>
          <AddToRow block="jwt" upd={upd} get={get} disabled={disabled} />
        </>
      )}

      {t === 'oauth2' && (
        <>
          {text('oauth2', 'accessToken', 'Access Token')}
          {text('oauth2', 'headerPrefix', 'Header Prefix')}
          <AddToRow block="oauth2" upd={upd} get={get} disabled={disabled} />
          <p style={{ color: 'var(--muted)', fontSize: '0.74rem', lineHeight: 1.5 }}>
            Paste an existing access token. Interactive grant flows (authorization code / client
            credentials) are not run from here.
          </p>
        </>
      )}

      {t === 'oauth1' && (
        <>
          <Field label="Signature Method">
            <select
              style={input}
              disabled={disabled}
              value={(get('oauth1').signatureMethod as string) ?? 'HMAC-SHA1'}
              onChange={(e) => upd('oauth1', { signatureMethod: e.target.value })}
            >
              {['HMAC-SHA1', 'HMAC-SHA256', 'PLAINTEXT'].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </Field>
          {text('oauth1', 'consumerKey', 'Consumer Key')}
          {text('oauth1', 'consumerSecret', 'Consumer Secret', 'password')}
          {text('oauth1', 'token', 'Access Token')}
          {text('oauth1', 'tokenSecret', 'Token Secret', 'password')}
          {text('oauth1', 'realm', 'Realm (optional)')}
          <AddToRow block="oauth1" upd={upd} get={get} disabled={disabled} />
        </>
      )}

      {t === 'awsv4' && (
        <>
          {text('awsv4', 'accessKey', 'Access Key')}
          {text('awsv4', 'secretKey', 'Secret Key', 'password')}
          {text('awsv4', 'region', 'AWS Region (e.g. us-east-1)')}
          {text('awsv4', 'service', 'Service Name (e.g. execute-api)')}
          {text('awsv4', 'sessionToken', 'Session Token (optional)')}
        </>
      )}

      {t === 'hawk' && (
        <>
          {text('hawk', 'authId', 'Hawk Auth ID')}
          {text('hawk', 'authKey', 'Hawk Auth Key', 'password')}
          <Field label="Algorithm">
            <select
              style={input}
              disabled={disabled}
              value={(get('hawk').algorithm as string) ?? 'sha256'}
              onChange={(e) => upd('hawk', { algorithm: e.target.value })}
            >
              <option value="sha256">sha256</option>
              <option value="sha1">sha1</option>
            </select>
          </Field>
          {text('hawk', 'user', 'User (optional)')}
          {text('hawk', 'nonce', 'Nonce (optional)')}
          {text('hawk', 'extData', 'Ext (optional)')}
          {text('hawk', 'app', 'App (optional)')}
          {text('hawk', 'dlg', 'Dlg (optional)')}
        </>
      )}

      {t === 'apikey' && (
        <>
          {text('apikey', 'key', 'Key')}
          {text('apikey', 'value', 'Value')}
          <Field label="Add to">
            <select
              style={input}
              disabled={disabled}
              value={(get('apikey').in as string) ?? 'header'}
              onChange={(e) => upd('apikey', { in: e.target.value })}
            >
              <option value="header">Header</option>
              <option value="query">Query Params</option>
            </select>
          </Field>
        </>
      )}

      {t === 'digest' && (
        <>
          {text('digest', 'username', 'Username')}
          {text('digest', 'password', 'Password', 'password')}
          {text('digest', 'realm', 'Realm')}
          {text('digest', 'nonce', 'Nonce')}
          {text('digest', 'opaque', 'Opaque')}
        </>
      )}

      {t === 'ntlm' && (
        <>
          {text('ntlm', 'username', 'Username')}
          {text('ntlm', 'password', 'Password', 'password')}
          {text('ntlm', 'domain', 'Domain')}
          {text('ntlm', 'workstation', 'Workstation')}
        </>
      )}

      {t === 'edgegrid' && (
        <>
          {text('edgegrid', 'accessToken', 'Access Token')}
          {text('edgegrid', 'clientToken', 'Client Token')}
          {text('edgegrid', 'clientSecret', 'Client Secret', 'password')}
        </>
      )}

      {t === 'asap' && (
        <>
          {text('asap', 'issuer', 'Issuer (iss)')}
          {text('asap', 'audience', 'Audience (aud)')}
          {text('asap', 'keyId', 'Key ID (kid)')}
          {text('asap', 'subject', 'Subject (sub)')}
          <Field label="Private Key (PEM)">
            <textarea
              style={{ ...input, minHeight: 90, fontFamily: 'ui-monospace, monospace' }}
              disabled={disabled}
              value={(get('asap').privateKey as string) ?? ''}
              onChange={(e) => upd('asap', { privateKey: e.target.value })}
            />
          </Field>
        </>
      )}
    </div>
  );
}

/** Shared "Add to: Header | Query" selector used by token-style schemes. */
function AddToRow({
  block,
  upd,
  get,
  disabled,
}: {
  block: string;
  upd: (block: string, partial: Record<string, unknown>) => void;
  get: (block: string) => Record<string, unknown>;
  disabled?: boolean;
}) {
  return (
    <Field label="Add to">
      <select
        style={input}
        disabled={disabled}
        value={(get(block).addTo as string) ?? 'header'}
        onChange={(e) => upd(block, { addTo: e.target.value })}
      >
        <option value="header">Request Headers</option>
        <option value="query">Query Params</option>
      </select>
    </Field>
  );
}
