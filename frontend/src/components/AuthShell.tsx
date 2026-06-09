import type { ReactNode } from 'react';

/** Centered card layout shared by the login/register pages. */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 380,
          padding: '2rem',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 12,
        }}
      >
        <h1 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem' }}>
          Rocket <span style={{ color: 'var(--accent)' }}>🚀</span>
        </h1>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1rem', color: 'var(--muted)', fontWeight: 400 }}>
          {title}
        </h2>
        {children}
      </div>
    </main>
  );
}

export const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  marginBottom: '0.75rem',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text)',
  fontSize: '0.95rem',
};

export const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem',
  background: 'var(--accent)',
  border: 'none',
  borderRadius: 8,
  color: '#fff',
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
};
