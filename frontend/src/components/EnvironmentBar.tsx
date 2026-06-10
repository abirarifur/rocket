'use client';

import { useEffect, useState } from 'react';
import { Eye, Layers } from 'lucide-react';
import type { Variable } from '@rocket/types';
import { useApp } from '@/store/appStore';
import { Modal } from './Modal';
import { VariablesEditor } from './VariablesEditor';
import { promptDialog, confirmDialog } from './dialogs';

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
  const [quickEdit, setQuickEdit] = useState(false);

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
      <button
        onClick={() => setQuickEdit(true)}
        style={{ ...ctrl, cursor: 'pointer', padding: '0.35rem 0.45rem' }}
        className="inline-flex items-center"
        title="Quick edit variables for the active environment"
      >
        <Eye size={15} />
      </button>
      <button onClick={() => setManaging(true)} style={{ ...ctrl, cursor: 'pointer' }} className="inline-flex items-center gap-1.5">
        <Layers size={15} /> Environments
      </button>
      {quickEdit && <QuickEditModal onClose={() => setQuickEdit(false)} onManage={() => { setQuickEdit(false); setManaging(true); }} />}
      {managing && <ManageModal onClose={() => setManaging(false)} />}
    </>
  );
}

/** Usage hint shown in every variable editor so the {{key}} syntax is discoverable. */
function UsageHint() {
  return (
    <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.75rem', lineHeight: 1.5 }}>
      Add a variable (e.g. <code>baseUrl</code> → <code>https://api.example.com</code>), Save, then
      use it anywhere in a request as <code>{'{{baseUrl}}'}</code> — URL, params, headers, body or
      auth. Secret values are encrypted at rest.
    </p>
  );
}

/** One-click editor for the variables of the currently active environment (Postman's eye quick-look). */
function QuickEditModal({ onClose, onManage }: { onClose: () => void; onManage: () => void }) {
  const { environments, activeEnvironmentId, updateEnvironment } = useApp();
  const active = environments.find((e) => e.id === activeEnvironmentId) ?? null;
  const [draftVars, setDraftVars] = useState<Variable[]>(active?.variables ?? []);
  const [saved, setSaved] = useState(false);

  if (!active) {
    return (
      <Modal title="Environment variables" onClose={onClose} width={460}>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>
          No environment is selected. Pick one from the dropdown (or create one in{' '}
          <button onClick={onManage} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, font: 'inherit' }}>Environments</button>
          ), then add variables here to use them as <code>{'{{key}}'}</code>.
        </p>
      </Modal>
    );
  }

  // Start with one empty row so the editor is never blank — makes adding the first var obvious.
  const rows = draftVars.length ? draftVars : [{ key: '', value: '', enabled: true, secret: false }];

  return (
    <Modal title={`Variables · ${active.name}`} onClose={onClose} width={620}>
      <VariablesEditor rows={rows} onChange={(v) => (setDraftVars(v), setSaved(false))} />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
        <button
          onClick={async () => {
            await updateEnvironment(active.id, { variables: draftVars.filter((v) => v.key.trim() !== '') });
            setSaved(true);
          }}
          style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '0.45rem 1rem', fontWeight: 600 }}
        >
          Save
        </button>
        {saved && <span style={{ color: 'var(--ok)', fontSize: '0.82rem' }}>Saved ✓</span>}
        <button onClick={onManage} style={{ ...ctrl, marginLeft: 'auto', cursor: 'pointer' }}>
          Manage environments
        </button>
      </div>
      <UsageHint />
    </Modal>
  );
}

function ManageModal({ onClose }: { onClose: () => void }) {
  const { environments, activeEnvironmentId, createEnvironment, updateEnvironment, deleteEnvironment } = useApp();
  const [selectedId, setSelectedId] = useState<string | null>(activeEnvironmentId ?? environments[0]?.id ?? null);
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
            onClick={async () => {
              const name = await promptDialog({ title: 'New environment', label: 'Environment name', defaultValue: 'Production', placeholder: 'Production' });
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
                    await updateEnvironment(selected.id, { variables: draftVars.filter((v) => v.key.trim() !== '') });
                    setSaved(true);
                  }}
                  style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '0.45rem 1rem', fontWeight: 600 }}
                >
                  Save
                </button>
                {saved && <span style={{ color: 'var(--ok)', fontSize: '0.82rem' }}>Saved ✓</span>}
                <button
                  onClick={async () => {
                    if (await confirmDialog({ title: 'Delete environment', message: `Delete environment "${selected.name}"?`, confirmLabel: 'Delete', danger: true })) {
                      void deleteEnvironment(selected.id);
                      setSelectedId(null);
                    }
                  }}
                  style={{ marginLeft: 'auto', background: 'transparent', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--bad)', cursor: 'pointer', padding: '0.45rem 0.8rem', fontSize: '0.82rem' }}
                >
                  Delete
                </button>
              </div>
              <UsageHint />
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
