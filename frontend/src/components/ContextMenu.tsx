'use client';

import { useEffect, useRef, useState } from 'react';

export type MenuItem =
  | { divider: true }
  | { label: string; onClick: () => void; shortcut?: string; danger?: boolean; disabled?: boolean };

/** A Postman-style popup menu anchored at (x, y); closes on outside click/Escape. */
export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number;
  y: number;
  items: MenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // Keep the menu inside the viewport.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = x + r.width > window.innerWidth ? Math.max(8, window.innerWidth - r.width - 8) : x;
    const top = y + r.height > window.innerHeight ? Math.max(8, window.innerHeight - r.height - 8) : y;
    setPos({ left, top });
  }, [x, y]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div onClick={onClose} onContextMenu={(e) => (e.preventDefault(), onClose())} style={{ position: 'fixed', inset: 0, zIndex: 100 }}>
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          left: pos.left,
          top: pos.top,
          minWidth: 200,
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '0.3rem',
          boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
        }}
      >
        {items.map((item, i) =>
          'divider' in item ? (
            <div key={i} style={{ height: 1, background: 'var(--border)', margin: '0.3rem 0.2rem' }} />
          ) : (
            <button
              key={i}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                item.onClick();
                onClose();
              }}
              style={{
                display: 'flex',
                width: '100%',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'transparent',
                border: 'none',
                borderRadius: 5,
                color: item.disabled ? 'var(--muted)' : item.danger ? 'var(--bad)' : 'var(--text)',
                cursor: item.disabled ? 'default' : 'pointer',
                padding: '0.42rem 0.6rem',
                fontSize: '0.85rem',
                textAlign: 'left',
                opacity: item.disabled ? 0.5 : 1,
              }}
              onMouseEnter={(e) => !item.disabled && (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.shortcut && (
                <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{item.shortcut}</span>
              )}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
