import Link from 'next/link';
import { apiHealth } from '@/lib/api';

export default async function HomePage() {
  let health: { status: string; service: string; db: string } | null = null;
  let error: string | null = null;
  try {
    health = await apiHealth();
  } catch (e) {
    error = e instanceof Error ? e.message : 'unreachable';
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '4rem 1.5rem' }}>
      <h1 style={{ fontSize: '2.5rem', margin: 0 }}>
        Rocket <span style={{ color: 'var(--accent)' }}>🚀</span>
      </h1>
      <p style={{ color: 'var(--muted)', marginTop: '0.5rem' }}>
        A Postman-inspired API platform. Auth & tenancy are live (Phase 1).
      </p>

      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
        <Link
          href="/register"
          style={{
            padding: '0.55rem 1.1rem',
            background: 'var(--accent)',
            color: '#fff',
            borderRadius: 8,
            textDecoration: 'none',
            fontWeight: 600,
          }}
        >
          Get started
        </Link>
        <Link
          href="/login"
          style={{
            padding: '0.55rem 1.1rem',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            borderRadius: 8,
            textDecoration: 'none',
          }}
        >
          Sign in
        </Link>
      </div>

      <section
        style={{
          marginTop: '2rem',
          padding: '1.25rem',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 12,
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>System status</h2>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: 2 }}>
          <li>
            Web: <Badge ok>online</Badge>
          </li>
          <li>
            API:{' '}
            {error ? <Badge>offline</Badge> : <Badge ok>{health?.status ?? 'unknown'}</Badge>}
          </li>
          <li>
            Database:{' '}
            {health?.db === 'up' ? <Badge ok>up</Badge> : <Badge>{health?.db ?? 'unknown'}</Badge>}
          </li>
        </ul>
        {error && (
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
            API not reachable yet — start it with <code>pnpm dev</code>. ({error})
          </p>
        )}
      </section>
    </main>
  );
}

function Badge({ children, ok = false }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.1rem 0.6rem',
        borderRadius: 999,
        fontSize: '0.8rem',
        background: ok ? 'rgba(63,185,80,0.15)' : 'rgba(248,81,73,0.15)',
        color: ok ? 'var(--ok)' : 'var(--bad)',
      }}
    >
      {children}
    </span>
  );
}
