'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { RequestAuth, Variable } from '@rocket/types';
import { useApp } from '@/store/appStore';
import { canEdit } from '@/lib/teams-api';
import { VariablesEditor } from './VariablesEditor';
import { AuthEditor } from './AuthEditor';

const input: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.5rem 0.6rem',
  fontSize: '0.9rem',
};

type SubTab = 'overview' | 'authorization' | 'variables';

/** Full-panel collection settings (Postman-style): Overview, Authorization, Variables. */
export function CollectionEditor({ collectionId }: { collectionId: string }) {
  const { cache, role } = useApp();
  const col = cache[collectionId];
  const editable = canEdit(role);
  const [sub, setSub] = useState<SubTab>('overview');

  if (!col) {
    return <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--muted)' }}>Loading collection…</div>;
  }

  const TABS: { key: SubTab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'authorization', label: 'Authorization' },
    { key: 'variables', label: 'Variables' },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div style={{ padding: '1rem 1.5rem 0' }}>
        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{col.name}</h2>
      </div>
      {/* sub-tabs */}
      <div style={{ display: 'flex', gap: '1.2rem', padding: '0.75rem 1.5rem 0', borderBottom: '1px solid var(--border)' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSub(t.key)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: sub === t.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: sub === t.key ? 'var(--text)' : 'var(--muted)',
              cursor: 'pointer',
              padding: '0.5rem 0',
              fontSize: '0.88rem',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
        {sub === 'overview' && <OverviewTab collectionId={collectionId} editable={editable} />}
        {sub === 'authorization' && <AuthorizationTab collectionId={collectionId} editable={editable} />}
        {sub === 'variables' && <VariablesTab collectionId={collectionId} editable={editable} />}
      </div>
    </div>
  );
}

function SaveRow({ status, onSave, editable }: { status: SaveStatus; onSave: () => void; editable: boolean }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', alignItems: 'center' }}>
      <button
        onClick={onSave}
        disabled={!editable || status === 'saving'}
        style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', cursor: editable ? 'pointer' : 'not-allowed', opacity: editable ? 1 : 0.5, padding: '0.5rem 1.2rem', fontWeight: 600 }}
      >
        {status === 'saving' ? 'Saving…' : 'Save'}
      </button>
      {status === 'saved' && <span style={{ color: 'var(--ok)', fontSize: '0.82rem' }} className="inline-flex items-center gap-1"><CheckCircle2 size={14} /> Saved</span>}
      {status === 'error' && <span style={{ color: 'var(--bad)', fontSize: '0.82rem' }}>Save failed</span>}
    </div>
  );
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function useSaver(fn: () => Promise<void>): [SaveStatus, () => Promise<void>, () => void] {
  const [status, setStatus] = useState<SaveStatus>('idle');
  const save = async () => {
    setStatus('saving');
    try {
      await fn();
      setStatus('saved');
    } catch {
      setStatus('error');
    }
  };
  return [status, save, () => setStatus('idle')];
}

function OverviewTab({ collectionId, editable }: { collectionId: string; editable: boolean }) {
  const { cache, updateCollectionMeta } = useApp();
  const col = cache[collectionId]!;
  const [name, setName] = useState(col.name);
  const [description, setDescription] = useState(col.description ?? '');

  useEffect(() => {
    setName(col.name);
    setDescription(col.description ?? '');
  }, [collectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [status, save, dirty] = useSaver(() => updateCollectionMeta(collectionId, { name: name.trim() || col.name, description }));

  return (
    <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <label style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Name</label>
      <input style={input} value={name} disabled={!editable} onChange={(e) => (setName(e.target.value), dirty())} />
      <label style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.5rem' }}>Description</label>
      <textarea
        style={{ ...input, minHeight: 160, resize: 'vertical', fontFamily: 'inherit' }}
        value={description}
        disabled={!editable}
        placeholder="Describe what this collection is for. Markdown is supported in Postman exports."
        onChange={(e) => (setDescription(e.target.value), dirty())}
      />
      <SaveRow status={status} onSave={save} editable={editable} />
    </div>
  );
}

function VariablesTab({ collectionId, editable }: { collectionId: string; editable: boolean }) {
  const { cache, setCollectionVariables } = useApp();
  const col = cache[collectionId]!;
  const [rows, setRows] = useState<Variable[]>((col.variables as Variable[]) ?? []);

  useEffect(() => {
    setRows((cache[collectionId]?.variables as Variable[]) ?? []);
  }, [collectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const editRows = rows.length ? rows : [{ key: '', value: '', enabled: true, secret: false }];
  const [status, save, dirty] = useSaver(() => setCollectionVariables(collectionId, rows.filter((v) => v.key.trim() !== '')));

  return (
    <div style={{ maxWidth: 820 }}>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: '0.9rem', lineHeight: 1.6 }}>
        These variables are scoped to <strong>{col.name}</strong> and available to every request in it as{' '}
        <code>{'{{key}}'}</code>. They are overridden by the active environment.
      </p>
      <VariablesEditor rows={editRows} onChange={(v) => (setRows(v), dirty())} />
      <SaveRow status={status} onSave={save} editable={editable} />
    </div>
  );
}

function AuthorizationTab({ collectionId, editable }: { collectionId: string; editable: boolean }) {
  const { cache, setCollectionAuth } = useApp();
  const col = cache[collectionId]!;
  const initial: RequestAuth = (col.auth as RequestAuth | null) ?? { type: 'none' };
  const [auth, setAuth] = useState<RequestAuth>(initial);

  useEffect(() => {
    setAuth((cache[collectionId]?.auth as RequestAuth | null) ?? { type: 'none' });
  }, [collectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [status, save, dirty] = useSaver(() => setCollectionAuth(collectionId, auth));
  const set = (next: RequestAuth) => (setAuth(next), dirty());

  return (
    <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <p style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: '0.4rem' }}>
        This authorization is applied to every request in this collection whose Auth is set to{' '}
        <strong>Inherit from collection</strong>. You can override it per request. Values may use{' '}
        <code>{'{{variables}}'}</code> (e.g. <code>{'{{access_token}}'}</code>).
      </p>
      <AuthEditor
        auth={auth.type === 'inherit' ? { ...auth, type: 'none' } : auth}
        onChange={set}
        disabled={!editable}
        allowInherit={false}
      />

      <SaveRow status={status} onSave={save} editable={editable} />
    </div>
  );
}
