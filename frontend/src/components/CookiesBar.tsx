'use client';

import { useState } from 'react';
import { useApp } from '@/store/appStore';
import * as jar from '@/lib/cookie-jar';
import { Modal } from './Modal';

const ctrl: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.35rem 0.6rem',
  fontSize: '0.82rem',
};

/** View/clear the per-workspace cookie jar (auto-captured from responses). */
export function CookiesBar() {
  const { workspaceId } = useApp();
  const [open, setOpen] = useState(false);
  if (!workspaceId) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ ...ctrl, cursor: 'pointer' }} title="Cookies">
        🍪
      </button>
      {open && <CookiesModal workspaceId={workspaceId} onClose={() => setOpen(false)} />}
    </>
  );
}

function CookiesModal({ workspaceId, onClose }: { workspaceId: string; onClose: () => void }) {
  const [cookies, setCookies] = useState<jar.StoredCookie[]>(() => jar.load(workspaceId));

  return (
    <Modal title="Cookies" onClose={onClose}>
      {cookies.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
          No cookies yet. They&apos;re captured automatically from responses and re-sent to matching
          hosts.
        </p>
      ) : (
        <>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ color: 'var(--muted)', textAlign: 'left' }}>
                <th style={{ padding: '0.3rem' }}>Domain</th>
                <th style={{ padding: '0.3rem' }}>Name</th>
                <th style={{ padding: '0.3rem' }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {cookies.map((c, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.3rem', color: 'var(--muted)' }}>{c.domain}</td>
                  <td style={{ padding: '0.3rem' }}>{c.name}</td>
                  <td style={{ padding: '0.3rem', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => {
              jar.clear(workspaceId);
              setCookies([]);
            }}
            style={{ ...ctrl, cursor: 'pointer', marginTop: '1rem', color: 'var(--bad)' }}
          >
            Clear all
          </button>
        </>
      )}
    </Modal>
  );
}
