'use client';

import { useState } from 'react';
import type { BodyMode, HttpMethod, RawLanguage, Variable } from '@rocket/types';
import { Code2, Send } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { canEdit } from '@/lib/teams-api';
import { uploadFile } from '@/lib/app-api';
import type { FormField } from '@rocket/types';
import { KeyValueEditor } from './KeyValueEditor';
import { AuthEditor } from './AuthEditor';
import { SaveButton } from './SaveButton';
import { CodeModal } from './CodeModal';
import { CodeEditor } from './CodeEditor';
import { VariableUrlInput } from './VariableUrlInput';
import { extractTokens, buildVarMap, interpolate } from '@/lib/vars';

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const BODY_MODES: BodyMode[] = ['none', 'raw', 'form-data', 'urlencoded', 'binary', 'graphql'];
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

/**
 * Inline feedback under the URL bar: shows which {{variables}} are used and warns
 * about any that aren't defined in the current scope (globals < collection < environment).
 */
function UrlVariableHint({ url }: { url: string }) {
  const { environments, activeEnvironmentId, activeCollectionId, cache, globals } = useApp();
  const tokens = extractTokens(url);
  if (tokens.length === 0) return null;

  const envVars = environments.find((e) => e.id === activeEnvironmentId)?.variables ?? [];
  const colVars = ((activeCollectionId && cache[activeCollectionId]?.variables) || []) as Variable[];
  const map = buildVarMap(globals, colVars, envVars);
  const missing = tokens.filter((t) => !(t in map));

  if (missing.length === 0) {
    // Show the fully-resolved URL so it's clear exactly what gets sent (a 4xx/5xx
    // here means the resolved URL itself is wrong, not that the variable failed).
    const resolved = interpolate(url, map);
    return (
      <div style={{ padding: '0 1rem 0.6rem', fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.5 }}>
        <span style={{ color: 'var(--ok)' }}>✓ Sends to:</span>{' '}
        <code style={{ color: 'var(--text)', wordBreak: 'break-all' }}>{resolved}</code>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 1rem 0.6rem', fontSize: '0.76rem', color: 'var(--accent)', lineHeight: 1.5 }}>
      ⚠ Not defined{activeEnvironmentId ? ' in the active environment' : ' (no environment selected)'}:{' '}
      {missing.map((t) => (
        <code key={t} style={{ background: 'rgba(255,107,53,0.12)', padding: '0 4px', borderRadius: 4, marginRight: 4 }}>{`{{${t}}}`}</code>
      ))}
      — open <strong>Environments</strong> (top-right) to add {missing.length > 1 ? 'them' : 'it'}.
    </div>
  );
}

export function RequestBuilder() {
  const { draft, updateDraft, send, sending, role } = useApp();
  // GraphQL requests open on the Body (query) editor; others start on Params.
  const [tab, setTab] = useState<Tab>(draft?.kind === 'graphql' ? 'body' : 'params');
  const [codeOpen, setCodeOpen] = useState(false);
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
        <VariableUrlInput
          style={{ ...input, flex: 1 }}
          placeholder="https://api.example.com/endpoint"
          value={draft.url}
          onChange={(url) => updateDraft({ url })}
        />
        <button
          onClick={() => setCodeOpen(true)}
          title="Code snippet"
          style={{
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text)',
            padding: '0 0.8rem',
            cursor: 'pointer',
          }}
        >
          <Code2 size={16} />
        </button>
        <SaveButton />
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
          className="inline-flex items-center gap-1.5"
        >
          <Send size={15} /> {sending ? 'Sending…' : 'Send'}
        </button>
      </div>
      {codeOpen && <CodeModal request={draft} onClose={() => setCodeOpen(false)} />}

      <UrlVariableHint url={draft.url} />

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
        {tab === 'auth' && (
          <AuthEditor auth={draft.auth} onChange={(auth) => updateDraft({ auth })} disabled={readOnly} />
        )}
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
      <CodeEditor value={value} language="javascript" onChange={onChange} minHeight="220px" placeholder={placeholder} />
      <p style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: '0.4rem' }}>
        Sandboxed JS · <code>pm.environment</code>, <code>pm.variables</code>, <code>pm.request</code>,{' '}
        <code>pm.response</code>, <code>pm.test</code>, <code>pm.expect</code>,{' '}
        <code>await pm.sendRequest()</code>, <code>console.log</code>
      </p>
    </div>
  );
}

function FormDataEditor({
  rows,
  onChange,
}: {
  rows: FormField[];
  onChange: (rows: FormField[]) => void;
}) {
  function update(i: number, patch: Partial<FormField>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <input type="checkbox" checked={r.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} />
          <input style={{ ...input, flex: 1 }} placeholder="key" value={r.key} onChange={(e) => update(i, { key: e.target.value })} />
          <select
            style={{ ...input, width: 80 }}
            value={r.type}
            onChange={(e) => update(i, { type: e.target.value as 'text' | 'file' })}
          >
            <option value="text">text</option>
            <option value="file">file</option>
          </select>
          {r.type === 'file' ? (
            <label style={{ ...input, flex: 2, cursor: 'pointer', color: r.fileRef ? 'var(--text)' : 'var(--muted)', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {r.fileRef ? r.value || 'file selected' : 'Choose file…'}
              <input
                type="file"
                style={{ display: 'none' }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const up = await uploadFile(f);
                  update(i, { fileRef: up.key, value: up.filename });
                }}
              />
            </label>
          ) : (
            <input style={{ ...input, flex: 2 }} placeholder="value" value={r.value} onChange={(e) => update(i, { value: e.target.value })} />
          )}
          <button onClick={() => onChange(rows.filter((_, idx) => idx !== i))} style={{ ...input, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted)' }}>
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={() => onChange([...rows, { key: '', value: '', enabled: true, type: 'text' }])}
        style={{ ...input, cursor: 'pointer', color: 'var(--accent)', width: 'fit-content', borderStyle: 'dashed' }}
      >
        + Add field
      </button>
    </div>
  );
}

function BinaryEditor({
  fileRef,
  filename,
  onChange,
}: {
  fileRef?: string;
  filename?: string;
  onChange: (fileRef: string, filename: string) => void;
}) {
  return (
    <div>
      <label style={{ ...input, display: 'inline-block', cursor: 'pointer', color: fileRef ? 'var(--text)' : 'var(--muted)' }}>
        {fileRef ? `📎 ${filename ?? 'file selected'}` : 'Choose a file to upload…'}
        <input
          type="file"
          style={{ display: 'none' }}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const up = await uploadFile(f);
            onChange(up.key, up.filename);
          }}
        />
      </label>
      <p style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: '0.4rem' }}>
        The file is uploaded to object storage and sent as the raw request body.
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
        <CodeEditor
          value={body.raw ?? ''}
          language={body.rawLanguage ?? 'text'}
          onChange={(v) => updateDraft({ body: { ...body, raw: v } })}
          placeholder="Request body"
        />
      )}

      {body.mode === 'urlencoded' && (
        <KeyValueEditor
          rows={body.urlencoded ?? []}
          onChange={(urlencoded) => updateDraft({ body: { ...body, urlencoded } })}
        />
      )}

      {body.mode === 'form-data' && (
        <FormDataEditor
          rows={body.formData ?? []}
          onChange={(formData) => updateDraft({ body: { ...body, formData } })}
        />
      )}

      {body.mode === 'binary' && (
        <BinaryEditor
          fileRef={body.binaryRef}
          filename={body.raw}
          onChange={(binaryRef, filename) => updateDraft({ body: { ...body, binaryRef, raw: filename } })}
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

