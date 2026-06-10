'use client';

import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api';

const LABELS: Record<string, string> = {
  google: 'Continue with Google',
  github: 'Continue with GitHub',
  mock: 'Continue with Mock (dev)',
};

/** Renders social-login buttons for whichever providers the API has configured. */
export function OAuthButtons() {
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/oauth/providers`)
      .then((r) => r.json())
      .then((d: { providers: string[] }) => setProviders(d.providers ?? []))
      .catch(() => setProviders([]));
  }, []);

  if (providers.length === 0) return null;

  return (
    <div style={{ marginTop: '1rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--muted)',
          fontSize: '0.75rem',
          margin: '0.5rem 0 0.75rem',
        }}
      >
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        or
        <span style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {providers.map((p) => (
          <a
            key={p}
            href={`${API_BASE}/api/auth/oauth/${p}`}
            style={{
              display: 'block',
              textAlign: 'center',
              padding: '0.6rem',
              border: '1px solid var(--border)',
              borderRadius: 8,
              color: 'var(--text)',
              textDecoration: 'none',
              fontSize: '0.9rem',
            }}
          >
            {LABELS[p] ?? `Continue with ${p}`}
          </a>
        ))}
      </div>
    </div>
  );
}
