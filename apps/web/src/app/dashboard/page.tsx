'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMe, logout, type Me } from '@/lib/auth-api';

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMe().then((data) => {
      if (!data) {
        router.replace('/login');
        return;
      }
      setMe(data);
      setLoading(false);
    });
  }, [router]);

  async function onLogout() {
    await logout().catch(() => undefined);
    router.replace('/login');
  }

  if (loading) {
    return <main style={{ padding: '4rem', color: 'var(--muted)' }}>Loading…</main>;
  }
  if (!me) return null;

  return (
    <main style={{ maxWidth: 820, margin: '0 auto', padding: '3rem 1.5rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0 }}>
          Rocket <span style={{ color: 'var(--accent)' }}>🚀</span>
        </h1>
        <button
          onClick={onLogout}
          style={{
            padding: '0.45rem 0.9rem',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
            cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </header>

      <p style={{ color: 'var(--muted)' }}>
        Signed in as <strong style={{ color: 'var(--text)' }}>{me.email}</strong>
        {!me.emailVerified && (
          <span style={{ color: 'var(--accent)', marginLeft: 8 }}>(email not verified)</span>
        )}
      </p>

      <section style={{ marginTop: '2rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>Your teams & workspaces</h2>
        {me.teams.map((team) => (
          <div
            key={team.id}
            style={{
              padding: '1rem 1.25rem',
              marginBottom: '0.75rem',
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{team.name}</strong>
              <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{team.role}</span>
            </div>
            <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem', color: 'var(--muted)' }}>
              {team.workspaces.map((w) => (
                <li key={w.id}>
                  {w.name} <span style={{ fontSize: '0.75rem' }}>· {w.visibility.toLowerCase()}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '2rem' }}>
        Collections and the request builder arrive in Phase 2.
      </p>
    </main>
  );
}
