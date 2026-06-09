'use client';

import type { KeyValue } from '@rocket/types';

const cell: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.4rem 0.5rem',
  fontSize: '0.85rem',
};

/** Editable list of enabled key/value rows (params, headers, urlencoded body). */
export function KeyValueEditor({
  rows,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: {
  rows: KeyValue[];
  onChange: (rows: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}) {
  function update(i: number, patch: Partial<KeyValue>) {
    onChange(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }
  function remove(i: number) {
    onChange(rows.filter((_, idx) => idx !== i));
  }
  function add() {
    onChange([...rows, { key: '', value: '', enabled: true }]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {rows.map((r, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={r.enabled}
            onChange={(e) => update(i, { enabled: e.target.checked })}
          />
          <input
            style={{ ...cell, flex: 1 }}
            placeholder={keyPlaceholder}
            value={r.key}
            onChange={(e) => update(i, { key: e.target.value })}
          />
          <input
            style={{ ...cell, flex: 2 }}
            placeholder={valuePlaceholder}
            value={r.value}
            onChange={(e) => update(i, { value: e.target.value })}
          />
          <button
            onClick={() => remove(i)}
            style={{
              ...cell,
              cursor: 'pointer',
              color: 'var(--muted)',
              borderColor: 'transparent',
            }}
            aria-label="Remove row"
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={add}
        style={{
          ...cell,
          cursor: 'pointer',
          color: 'var(--accent)',
          width: 'fit-content',
          borderStyle: 'dashed',
        }}
      >
        + Add
      </button>
    </div>
  );
}
