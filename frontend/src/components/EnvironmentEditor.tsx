'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Plus, Star, Trash2 } from 'lucide-react';
import type { Variable } from '@rocket/types';
import { useApp } from '@/store/appStore';
import { canEdit } from '@/lib/teams-api';
import { VariablesEditor } from './VariablesEditor';
import { promptDialog, confirmDialog } from './dialogs';

/**
 * Full-panel environment editor shown in its own tab (replaces the old modal).
 * Left: environment list. Right: variable editor for the selected environment.
 */
export function EnvironmentEditor() {
  const {
    environments,
    activeEnvironmentId,
    role,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    setActiveEnvironment,
  } = useApp();
  const editable = canEdit(role);

  const [selectedId, setSelectedId] = useState<string | null>(activeEnvironmentId ?? environments[0]?.id ?? null);
  const selected = environments.find((e) => e.id === selectedId) ?? null;
  const [draftVars, setDraftVars] = useState<Variable[]>(selected?.variables ?? []);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Load the selected environment's variables (also runs when environments first arrive or change).
  useEffect(() => {
    if (!selectedId && environments[0]) {
      setSelectedId(environments[0].id);
      return;
    }
    const env = environments.find((e) => e.id === selectedId);
    setDraftVars(env?.variables ?? []);
    setStatus('idle');
    setError(null);
  }, [selectedId, environments]);

  async function save() {
    if (!selected) return;
    setStatus('saving');
    setError(null);
    try {
      await updateEnvironment(selected.id, { variables: draftVars.filter((v) => v.key.trim() !== '') });
      setStatus('saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setStatus('error');
    }
  }

  async function addEnvironment() {
    const name = await promptDialog({ title: 'New environment', label: 'Environment name', defaultValue: 'Production', placeholder: 'Production' });
    if (name) await createEnvironment(name);
  }

  // Never show a blank editor — seed one empty row so adding the first variable is obvious.
  const rows = draftVars.length ? draftVars : [{ key: '', value: '', enabled: true, secret: false }];
  const isActive = selected?.id === activeEnvironmentId;

  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      {/* environment list */}
      <div style={{ width: 220, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', letterSpacing: 0.4, color: 'var(--muted)' }}>
          ENVIRONMENTS
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem' }}>
          {environments.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem', padding: '0.5rem' }}>No environments yet.</p>
          )}
          {environments.map((e) => (
            <div
              key={e.id}
              onClick={() => setSelectedId(e.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.45rem 0.55rem',
                borderRadius: 6,
                cursor: 'pointer',
                background: e.id === selectedId ? 'rgba(255,107,53,0.12)' : 'transparent',
                fontSize: '0.86rem',
              }}
            >
              {e.id === activeEnvironmentId && <Star size={13} className="text-primary" fill="currentColor" />}
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</span>
            </div>
          ))}
        </div>
        {editable && (
          <button
            onClick={addEnvironment}
            style={{ margin: '0.5rem', background: 'none', border: '1px dashed var(--border)', borderRadius: 6, color: 'var(--accent)', cursor: 'pointer', padding: '0.45rem 0.5rem', fontSize: '0.82rem' }}
            className="inline-flex items-center justify-center gap-1.5"
          >
            <Plus size={15} /> New environment
          </button>
        )}
      </div>

      {/* variable editor */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', minWidth: 0 }}>
        {!selected ? (
          <div style={{ color: 'var(--muted)', maxWidth: 460 }}>
            <p style={{ marginBottom: '0.75rem' }}>Select an environment, or create one to get started.</p>
            {editable && (
              <button onClick={addEnvironment} style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '0.5rem 1rem', fontWeight: 600 }} className="inline-flex items-center gap-1.5">
                <Plus size={15} /> New environment
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{selected.name}</h2>
              {isActive ? (
                <span style={{ fontSize: '0.72rem', color: 'var(--ok)', border: '1px solid var(--ok)', borderRadius: 999, padding: '0.05rem 0.5rem' }} className="inline-flex items-center gap-1">
                  <CheckCircle2 size={12} /> Active
                </span>
              ) : (
                <button
                  onClick={() => setActiveEnvironment(selected.id)}
                  style={{ fontSize: '0.75rem', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', cursor: 'pointer', padding: '0.25rem 0.6rem' }}
                  className="inline-flex items-center gap-1.5"
                >
                  <Star size={13} /> Set active
                </button>
              )}
              {editable && (
                <button
                  onClick={async () => {
                    if (await confirmDialog({ title: 'Delete environment', message: `Delete environment "${selected.name}"?`, confirmLabel: 'Delete', danger: true })) {
                      await deleteEnvironment(selected.id);
                      setSelectedId(null);
                    }
                  }}
                  title="Delete environment"
                  style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--bad)', cursor: 'pointer', padding: '0.35rem 0.55rem' }}
                  className="inline-flex items-center"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>

            <VariablesEditor rows={rows} onChange={(v) => (setDraftVars(v), setStatus('idle'))} />

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', alignItems: 'center' }}>
              <button
                onClick={save}
                disabled={!editable || status === 'saving'}
                style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', cursor: editable ? 'pointer' : 'not-allowed', opacity: editable ? 1 : 0.5, padding: '0.5rem 1.2rem', fontWeight: 600 }}
              >
                {status === 'saving' ? 'Saving…' : 'Save'}
              </button>
              {status === 'saved' && <span style={{ color: 'var(--ok)', fontSize: '0.82rem' }} className="inline-flex items-center gap-1"><CheckCircle2 size={14} /> Saved</span>}
              {status === 'error' && <span style={{ color: 'var(--bad)', fontSize: '0.82rem' }}>{error}</span>}
            </div>

            <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: '1.25rem', lineHeight: 1.6, maxWidth: 640 }}>
              Add a variable (e.g. <code>baseUrl</code> → <code>https://api.example.com</code>), Save, then
              use it anywhere in a request as <code>{'{{baseUrl}}'}</code> — URL, params, headers, body or
              auth. Mark a value <strong>secret</strong> to mask it and encrypt it at rest. The{' '}
              <Star size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> environment is the one
              applied when you send.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
