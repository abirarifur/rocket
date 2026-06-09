'use client';

import { useState } from 'react';
import type { Variable } from '@rocket/types';
import { useApp } from '@/store/appStore';
import { Modal } from './Modal';
import { VariablesEditor } from './VariablesEditor';

const ctrl: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.35rem 0.6rem',
  fontSize: '0.82rem',
};

export function EnvironmentBar() {
  const { environments, activeEnvironmentId, setActiveEnvironment } = useApp();
  const [managing, setManaging] = useState(false);

  return (
    <>
      <select
        value={activeEnvironmentId ?? ''}
        onChange={(e) => setActiveEnvironment(e.target.value || null)}
        style={ctrl}
        title="Active environment"
      >
        <option value="">No environment</option>
        {environments.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <button onClick={() => setManaging(true)} style={{ ...ctrl, cursor: 'pointer' }}>
        ⚙ Environments
      </button>
      {managing && <ManageModal onClose={() => setManaging(false)} />}
    </>
  );
}

function ManageModal({ onClose }: { onClose: () => void }) {
  const { environments, createEnvironment, updateEnvironment, deleteEnvironment } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(environments[0]?.id ?? null);
  const selected = environments.find((e) => e.id === selectedId) ?? null;
  const [draftVars, setDraftVars] = useState<Variable[]>(selected?.variables ?? []);
  const [saved, setSaved] = useState(false);

  function selectEnv(id: string) {
    setSelectedId(id);
    setDraftVars(environments.find((e) => e.id === id)?.variables ?? []);
    setSaved(false);
  }

  return (
    <Modal title="Environments" onClose={onClose}>
      <div style={{ display: 'flex', gap: '1rem' }}>
        {/* env list */}
        <div style={{ width: 170, borderRight: '1px solid var(--border)', paddingRight: '0.75rem' }}>
          {environments.map((e) => (
            <div
              key={e.id}
              onClick={() => selectEnv(e.id)}
              style={{
                padding: '0.4rem 0.5rem',
                borderRadius: 6,
                cursor: 'pointer',
                background: e.id === selectedId ? 'rgba(255,107,53,0.12)' : 'transparent',
                fontSize: '0.85rem',
              }}
            >
              {e.name}
            </div>
          ))}
          <button
            onClick={() => {
              const name = window.prompt('Environment name', 'Production');
              if (name) void createEnvironment(name);
            }}
            style={{ marginTop: '0.5rem', background: 'none', border: '1px dashed var(--border)', borderRadius: 6, color: 'var(--accent)', cursor: 'pointer', padding: '0.35rem 0.5rem', width: '100%', fontSize: '0.8rem' }}
          >
            + New environment
          </button>
        </div>

        {/* editor */}
        <div style={{ flex: 1 }}>
          {!selected ? (
            <p style={{ color: 'var(--muted)' }}>Select or create an environment.</p>
          ) : (
            <>
              <VariablesEditor rows={draftVars} onChange={(v) => (setDraftVars(v), setSaved(false))} />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
                <button
                  onClick={async () => {
                    await updateEnvironment(selected.id, { variables: draftVars });
                    setSaved(true);
                  }}
                  style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '0.45rem 1rem', fontWeight: 600 }}
                >
                  Save
                </button>
                {saved && <span style={{ color: 'var(--ok)', fontSize: '0.82rem' }}>Saved ✓</span>}
                <button
                  onClick={() => {
                    if (window.confirm(`Delete environment "${selected.name}"?`)) {
                      void deleteEnvironment(selected.id);
                      setSelectedId(null);
                    }
                  }}
                  style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--bad)', cursor: 'pointer', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
                >
                  Delete
                </button>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.75rem' }}>
                Use variables anywhere as <code>{'{{key}}'}</code>. Secret values are encrypted at rest.
              </p>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
