'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

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
    <div onClick={onClose} onContextMenu={(e) => (e.preventDefault(), onClose())} className="fixed inset-0 z-[100]">
      <div
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        style={{ left: pos.left, top: pos.top }}
        className="fixed min-w-[12rem] animate-in fade-in-0 zoom-in-95 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
      >
        {items.map((item, i) =>
          'divider' in item ? (
            <div key={i} className="my-1 h-px bg-border" />
          ) : (
            <button
              key={i}
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                item.onClick();
                onClose();
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-sm px-2.5 py-1.5 text-left text-sm outline-none transition-colors',
                'hover:bg-accent hover:text-accent-foreground focus:bg-accent',
                item.danger && 'text-destructive hover:text-destructive',
                item.disabled && 'pointer-events-none opacity-50',
              )}
            >
              <span className="flex-1">{item.label}</span>
              {item.shortcut && <span className="text-xs text-muted-foreground">{item.shortcut}</span>}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
