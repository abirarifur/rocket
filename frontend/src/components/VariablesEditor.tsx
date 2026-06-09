'use client';

import { useState } from 'react';
import type { Variable } from '@rocket/types';

const cell: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.4rem 0.5rem',
  fontSize: '0.85rem',
};

/** Editable variable list with a per-row secret toggle (masked + reveal). */
export function VariablesEditor({
  rows,
  onChange,
}: {
  rows: Variable[];
  onChange: (rows: Variable[]) => void;
}) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  function update(i: number, patch: Partial<Variable>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', gap: '0.4rem', color: 'var(--muted)', fontSize: '0.72rem', paddingLeft: 24 }}>
        <span style={{ flex: 1 }}>VARIABLE</span>
        <span style={{ flex: 2 }}>VALUE</span>
        <span style={{ width: 96, textAlign: 'center' }}>SECRET</span>
        <span style={{ width: 20 }} />
      </div>
      {rows.map((r, i) => {
        const masked = r.secret && !revealed[i];
        return (
          <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={r.enabled}
              onChange={(e) => update(i, { enabled: e.target.checked })}
              title="Enabled"
            />
            <input
              style={{ ...cell, flex: 1 }}
              placeholder="key"
              value={r.key}
              onChange={(e) => update(i, { key: e.target.value })}
            />
            <input
              style={{ ...cell, flex: 2 }}
              placeholder="value"
              type={masked ? 'password' : 'text'}
              value={r.value}
              onChange={(e) => update(i, { value: e.target.value })}
            />
            <label style={{ width: 96, display: 'flex', gap: 4, justifyContent: 'center', alignItems: 'center', fontSize: '0.78rem', color: 'var(--muted)' }}>
              <input
                type="checkbox"
                checked={r.secret}
                onChange={(e) => update(i, { secret: e.target.checked })}
              />
              {r.secret && (
                <button
                  type="button"
                  onClick={() => setRevealed((s) => ({ ...s, [i]: !s[i] }))}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                  title={masked ? 'Reveal' : 'Hide'}
                >
                  {masked ? '👁' : '🙈'}
                </button>
              )}
            </label>
            <button
              onClick={() => onChange(rows.filter((_, idx) => idx !== i))}
              style={{ ...cell, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--muted)', width: 20 }}
              aria-label="Remove"
            >
              ✕
            </button>
          </div>
        );
      })}
      <button
        onClick={() => onChange([...rows, { key: '', value: '', enabled: true, secret: false }])}
        style={{ ...cell, cursor: 'pointer', color: 'var(--accent)', width: 'fit-content', borderStyle: 'dashed' }}
      >
        + Add variable
      </button>
    </div>
  );
}
