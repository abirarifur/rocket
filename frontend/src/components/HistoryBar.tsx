'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/store/appStore';
import { listHistory, type HistoryEntry } from '@/lib/history-api';
import { Modal } from './Modal';

const METHOD_COLOR: Record<string, string> = {
  GET: '#3fb950',
  POST: '#d29922',
  PUT: '#58a6ff',
  PATCH: '#a371f7',
  DELETE: '#f85149',
};

const ctrl: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.35rem 0.6rem',
  fontSize: '0.82rem',
};

/** Recent sends, click to replay into the builder. */
export function HistoryBar() {
  const { workspaceId, loadDraft } = useApp();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} style={{ ...ctrl, cursor: 'pointer' }} title="Request history">
        🕘 History
      </button>
      {open && workspaceId && (
        <HistoryModal
          workspaceId={workspaceId}
          onPick={(e) => {
            loadDraft(e.request);
            setOpen(false);
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function HistoryModal({
  workspaceId,
  onPick,
  onClose,
}: {
  workspaceId: string;
  onPick: (e: HistoryEntry) => void;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  useEffect(() => {
    listHistory(workspaceId).then(setEntries);
  }, [workspaceId]);

  return (
    <Modal title="Request history" onClose={onClose}>
      {!entries ? (
        <p style={{ color: 'var(--muted)' }}>Loading…</p>
      ) : entries.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No requests sent yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: '60vh', overflowY: 'auto' }}>
          {entries.map((e) => {
            const ok = e.responseMeta.status >= 200 && e.responseMeta.status < 400;
            return (
              <button
                key={e.id}
                onClick={() => onPick(e)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  padding: '0.5rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  color: 'var(--text)',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ color: METHOD_COLOR[e.request.method] ?? 'var(--muted)', fontWeight: 700, width: 48, fontSize: '0.72rem' }}>
                  {e.request.method}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                  {e.request.url || e.request.name}
                </span>
                <span style={{ color: ok ? 'var(--ok)' : 'var(--bad)', fontSize: '0.78rem' }}>{e.responseMeta.status}</span>
                <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{Math.round(e.responseMeta.timeMs)}ms</span>
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
