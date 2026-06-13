'use client';

import { useEffect, useState } from 'react';
import { apiHealth } from '@/lib/api';

type State = 'loading' | 'ok' | 'degraded' | 'down';

/** Honest live API status, pinged client-side from the footer. */
export function StatusPill() {
  const [state, setState] = useState<State>('loading');

  useEffect(() => {
    let active = true;
    apiHealth()
      .then((h) => active && setState(h.db === 'up' ? 'ok' : 'degraded'))
      .catch(() => active && setState('down'));
    return () => {
      active = false;
    };
  }, []);

  const map: Record<State, { color: string; label: string }> = {
    loading: { color: 'bg-muted-foreground', label: 'Checking status…' },
    ok: { color: 'bg-success', label: 'All systems operational' },
    degraded: { color: 'bg-[hsl(43_96%_56%)]', label: 'Partial degradation' },
    down: { color: 'bg-destructive', label: 'API unreachable' },
  };
  const { color, label } = map[state];

  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span className={`relative flex h-2 w-2`}>
        {state === 'ok' && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${color} opacity-60`} />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${color}`} />
      </span>
      {label}
    </span>
  );
}
