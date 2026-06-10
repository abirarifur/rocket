'use client';

import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import type { Variable } from '@rocket/types';
import { useApp } from '@/store/appStore';
import * as teams from '@/lib/teams-api';
import { canEdit } from '@/lib/teams-api';
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

/** Team-wide (global) variables — lowest-precedence scope. */
export function GlobalsBar() {
  const { teamId, role } = useApp();
  const [open, setOpen] = useState(false);
  if (!teamId) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ ...ctrl, cursor: 'pointer' }} className="inline-flex items-center gap-1.5" title="Global variables">
        <Globe size={15} /> Globals
      </button>
      {open && <GlobalsModal teamId={teamId} editable={canEdit(role)} onClose={() => setOpen(false)} />}
    </>
  );
}

function GlobalsModal({ teamId, editable, onClose }: { teamId: string; editable: boolean; onClose: () => void }) {
  const [rows, setRows] = useState<Variable[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    teams.getGlobals(teamId).then((g) => setRows(g as Variable[])).catch(() => undefined);
  }, [teamId]);

  return (
    <Modal title="Global variables" onClose={onClose}>
      <VariablesEditor rows={rows} onChange={(v) => (setRows(v), setSaved(false))} />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
        {editable && (
          <button
            onClick={async () => {
              await teams.setGlobals(teamId, rows as teams.GlobalVar[]);
              await useApp.getState().refreshGlobals();
              setSaved(true);
            }}
            style={{ ...ctrl, cursor: 'pointer', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 600 }}
          >
            Save
          </button>
        )}
        {saved && <span style={{ color: 'var(--ok)', fontSize: '0.82rem' }}>Saved ✓</span>}
        <span style={{ color: 'var(--muted)', fontSize: '0.75rem', marginLeft: 'auto' }}>
          Team-wide · overridden by collection & environment scopes
        </span>
      </div>
    </Modal>
  );
}
