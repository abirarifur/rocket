'use client';

import { useMemo, useRef } from 'react';
import type { Variable } from '@rocket/types';
import { useApp } from '@/store/appStore';
import { buildVarMap } from '@/lib/vars';

// Split on {{var}} while keeping the delimiters (capture group), so we can color them.
const SPLIT = /(\{\{\s*[\w.-]+\s*\}\})/g;
const ONE = /^\{\{\s*([\w.-]+)\s*\}\}$/;

const RESOLVED = 'var(--accent)'; // orange — a recognized variable
const UNRESOLVED = '#f85149'; // red — not defined in any active scope

/**
 * URL input that highlights {{variables}} in place (orange = resolved, red = undefined),
 * so it's obvious which tokens come from a variable and whether they'll actually resolve.
 * Implemented with the standard "transparent input over a colored backdrop" technique.
 */
export function VariableUrlInput({
  value,
  onChange,
  placeholder,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const { environments, activeEnvironmentId, activeCollectionId, cache, globals } = useApp();

  const map = useMemo(() => {
    const envVars = environments.find((e) => e.id === activeEnvironmentId)?.variables ?? [];
    const colVars = ((activeCollectionId && cache[activeCollectionId]?.variables) || []) as Variable[];
    return buildVarMap(globals, colVars, envVars);
  }, [environments, activeEnvironmentId, activeCollectionId, cache, globals]);

  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const syncScroll = () => {
    if (backdropRef.current && inputRef.current) backdropRef.current.scrollLeft = inputRef.current.scrollLeft;
  };

  const { flex, ...boxBase } = (style ?? {}) as React.CSSProperties & { flex?: number };
  // Shared box model so the backdrop text and the input caret line up exactly.
  const shared: React.CSSProperties = { ...boxBase, margin: 0, boxSizing: 'border-box', width: '100%' };

  const parts = value.split(SPLIT);

  return (
    <div style={{ position: 'relative', flex: flex ?? 1, minWidth: 0 }}>
      <div
        ref={backdropRef}
        aria-hidden
        style={{
          ...shared,
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          whiteSpace: 'pre',
          pointerEvents: 'none',
          color: 'var(--text)',
        }}
      >
        {value === '' ? (
          <span style={{ color: 'var(--muted)' }}>{placeholder}</span>
        ) : (
          parts.map((part, i) => {
            const m = part.match(ONE);
            if (!m) return <span key={i}>{part}</span>;
            const ok = m[1] in map;
            return (
              <span
                key={i}
                style={{
                  color: ok ? RESOLVED : UNRESOLVED,
                  fontWeight: 600,
                  // Undefined variables also get a dashed underline so they're unmistakable.
                  textDecoration: ok ? undefined : 'underline dashed',
                  textUnderlineOffset: 2,
                }}
              >
                {part}
              </span>
            );
          })
        )}
      </div>
      <input
        ref={inputRef}
        value={value}
        aria-label="Request URL"
        spellCheck={false}
        onChange={(e) => {
          onChange(e.target.value);
          requestAnimationFrame(syncScroll);
        }}
        onScroll={syncScroll}
        style={{
          ...shared,
          position: 'relative',
          border: '1px solid transparent', // keep the same box; the backdrop draws the visible border
          background: 'transparent',
          color: 'transparent',
          caretColor: 'var(--text)',
        }}
      />
    </div>
  );
}
