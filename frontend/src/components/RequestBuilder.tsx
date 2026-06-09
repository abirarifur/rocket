'use client';

import { useState } from 'react';
import type { BodyMode, HttpMethod, RawLanguage } from '@rocket/types';
import { useApp } from '@/store/appStore';
import { canEdit } from '@/lib/teams-api';
import { KeyValueEditor } from './KeyValueEditor';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const BODY_MODES: BodyMode[] = ['none', 'raw', 'urlencoded', 'graphql'];
const RAW_LANGS: RawLanguage[] = ['text', 'json', 'xml', 'html', 'javascript'];

type Tab = 'params' | 'headers' | 'body' | 'auth' | 'pre' | 'tests';

const input: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.5rem 0.6rem',
  fontSize: '0.9rem',
};

export function RequestBuilder() {
  const { draft, updateDraft, send, sending, role } = useApp();
  const [tab, setTab] = useState<Tab>('params');
  const readOnly = !canEdit(role);

  if (!draft) {
    return (
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>
        Select or create a request to get started.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      {readOnly && (
        <div
          style={{
            background: 'rgba(255,107,53,0.1)',
            color: 'var(--accent)',
            fontSize: '0.75rem',
            padding: '0.3rem 1rem',
          }}
        >
          Read-only — your role can send requests but not save changes.
        </div>
      )}
      {/* URL bar */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem' }}>
        <select
          value={draft.method}
          onChange={(e) => updateDraft({ method: e.target.value as HttpMethod })}
          style={{ ...input, fontWeight: 700, width: 110 }}
        >
          {METHODS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <input
          style={{ ...input, flex: 1 }}
          placeholder="https://api.example.com/endpoint"
          value={draft.url}
          onChange={(e) => updateDraft({ url: e.target.value })}
        />
        <button
          onClick={() => void send()}
          disabled={sending || !draft.url}
          style={{
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            fontWeight: 700,
            padding: '0 1.4rem',
            cursor: sending ? 'default' : 'pointer',
            opacity: !draft.url ? 0.5 : 1,
          }}
        >
          {sending ? '…' : 'Send'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1.2rem', padding: '0 1rem', borderBottom: '1px solid var(--border)' }}>
        {(['params', 'headers', 'body', 'auth', 'pre', 'tests'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t ? 'var(--text)' : 'var(--muted)',
              cursor: 'pointer',
              padding: '0.6rem 0',
              fontSize: '0.85rem',
              textTransform: 'capitalize',
            }}
          >
            {t === 'pre' ? 'Pre-request' : t}
            {t === 'pre' && draft.preRequestScript?.trim() ? ' •' : ''}
            {t === 'tests' && draft.testScript?.trim() ? ' •' : ''}
          </button>
        ))}
      </div>

      {/* Tab body */}
      <div style={{ padding: '1rem', overflowY: 'auto' }}>
        {tab === 'params' && (
          <KeyValueEditor rows={draft.params} onChange={(params) => updateDraft({ params })} />
        )}
        {tab === 'headers' && (
          <KeyValueEditor rows={draft.headers} onChange={(headers) => updateDraft({ headers })} />
        )}
        {tab === 'body' && <BodyEditor />}
        {tab === 'auth' && <AuthEditor />}
        {tab === 'pre' && (
          <ScriptEditor
            value={draft.preRequestScript ?? ''}
            onChange={(v) => updateDraft({ preRequestScript: v })}
            placeholder={'// Runs before the request.\n// pm.environment.set("token", "...")'}
          />
        )}
        {tab === 'tests' && (
          <ScriptEditor
            value={draft.testScript ?? ''}
            onChange={(v) => updateDraft({ testScript: v })}
            placeholder={
              '// Runs after the response.\npm.test("status is 200", () => {\n  pm.response.to.have.status(200);\n});'
            }
          />
        )}
      </div>
    </div>
  );
}

function ScriptEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <textarea
        style={{
          ...input,
          width: '100%',
          minHeight: 220,
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.82rem',
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
      />
      <p style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: '0.4rem' }}>
        Sandboxed JS · <code>pm.environment</code>, <code>pm.variables</code>, <code>pm.request</code>,{' '}
        <code>pm.response</code>, <code>pm.test</code>, <code>pm.expect</code>, <code>console.log</code>
      </p>
    </div>
  );
}

function BodyEditor() {
  const { draft, updateDraft } = useApp();
  if (!draft) return null;
  const body = draft.body;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <select
          value={body.mode}
          onChange={(e) => updateDraft({ body: { ...body, mode: e.target.value as BodyMode } })}
          style={input}
        >
          {BODY_MODES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        {body.mode === 'raw' && (
          <select
            value={body.rawLanguage ?? 'text'}
            onChange={(e) =>
              updateDraft({ body: { ...body, rawLanguage: e.target.value as RawLanguage } })
            }
            style={input}
          >
            {RAW_LANGS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        )}
      </div>

      {body.mode === 'none' && <p style={{ color: 'var(--muted)' }}>This request has no body.</p>}

      {body.mode === 'raw' && (
        <textarea
          style={{ ...input, minHeight: 180, fontFamily: 'ui-monospace, monospace' }}
          value={body.raw ?? ''}
          onChange={(e) => updateDraft({ body: { ...body, raw: e.target.value } })}
          placeholder="Request body"
        />
      )}

      {body.mode === 'urlencoded' && (
        <KeyValueEditor
          rows={body.urlencoded ?? []}
          onChange={(urlencoded) => updateDraft({ body: { ...body, urlencoded } })}
        />
      )}

      {body.mode === 'graphql' && (
        <>
          <textarea
            style={{ ...input, minHeight: 140, fontFamily: 'ui-monospace, monospace' }}
            value={body.graphql?.query ?? ''}
            onChange={(e) =>
              updateDraft({ body: { ...body, graphql: { ...body.graphql, query: e.target.value } } })
            }
            placeholder="query { ... }"
          />
          <textarea
            style={{ ...input, minHeight: 80, fontFamily: 'ui-monospace, monospace' }}
            value={body.graphql?.variables ?? ''}
            onChange={(e) =>
              updateDraft({
                body: { ...body, graphql: { query: body.graphql?.query ?? '', variables: e.target.value } },
              })
            }
            placeholder='{ "variables": "as JSON" }'
          />
        </>
      )}
    </div>
  );
}

function AuthEditor() {
  const { draft, updateDraft } = useApp();
  if (!draft) return null;
  const auth = draft.auth;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxWidth: 460 }}>
      <select
        value={auth.type}
        onChange={(e) => updateDraft({ auth: { ...auth, type: e.target.value as typeof auth.type } })}
        style={input}
      >
        <option value="none">No Auth</option>
        <option value="basic">Basic</option>
        <option value="bearer">Bearer Token</option>
        <option value="apikey">API Key</option>
      </select>

      {auth.type === 'basic' && (
        <>
          <input
            style={input}
            placeholder="Username"
            value={auth.basic?.username ?? ''}
            onChange={(e) =>
              updateDraft({ auth: { ...auth, basic: { username: e.target.value, password: auth.basic?.password ?? '' } } })
            }
          />
          <input
            style={input}
            type="password"
            placeholder="Password"
            value={auth.basic?.password ?? ''}
            onChange={(e) =>
              updateDraft({ auth: { ...auth, basic: { username: auth.basic?.username ?? '', password: e.target.value } } })
            }
          />
        </>
      )}

      {auth.type === 'bearer' && (
        <input
          style={input}
          placeholder="Token"
          value={auth.bearer?.token ?? ''}
          onChange={(e) => updateDraft({ auth: { ...auth, bearer: { token: e.target.value } } })}
        />
      )}

      {auth.type === 'apikey' && (
        <>
          <input
            style={input}
            placeholder="Key"
            value={auth.apikey?.key ?? ''}
            onChange={(e) =>
              updateDraft({
                auth: { ...auth, apikey: { key: e.target.value, value: auth.apikey?.value ?? '', in: auth.apikey?.in ?? 'header' } },
              })
            }
          />
          <input
            style={input}
            placeholder="Value"
            value={auth.apikey?.value ?? ''}
            onChange={(e) =>
              updateDraft({
                auth: { ...auth, apikey: { key: auth.apikey?.key ?? '', value: e.target.value, in: auth.apikey?.in ?? 'header' } },
              })
            }
          />
          <select
            value={auth.apikey?.in ?? 'header'}
            onChange={(e) =>
              updateDraft({
                auth: { ...auth, apikey: { key: auth.apikey?.key ?? '', value: auth.apikey?.value ?? '', in: e.target.value as 'header' | 'query' } },
              })
            }
            style={input}
          >
            <option value="header">Add to Header</option>
            <option value="query">Add to Query Params</option>
          </select>
        </>
      )}
    </div>
  );
}
