'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMe, logout } from '@/lib/auth-api';
import { useApp } from '@/store/appStore';
import { Sidebar } from '@/components/Sidebar';
import { RequestBuilder } from '@/components/RequestBuilder';
import { ResponseViewer } from '@/components/ResponseViewer';
import { EnvironmentBar } from '@/components/EnvironmentBar';
import { WorkspaceBar } from '@/components/WorkspaceBar';
import { MembersBar } from '@/components/MembersBar';

export default function AppPage() {
  const router = useRouter();
  const { init } = useApp();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchMe().then(async (me) => {
      if (!me) {
        router.replace('/login');
        return;
      }
      setEmail(me.email);
      await init(me.defaultWorkspace?.id);
      setReady(true);
    });
  }, [init, router]);

  if (!ready) {
    return <div style={{ padding: '4rem', color: 'var(--muted)' }}>Loading workspace…</div>;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          padding: '0.6rem 1rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <strong>
          Rocket <span style={{ color: 'var(--accent)' }}>🚀</span>
        </strong>
        <WorkspaceBar />
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <EnvironmentBar />
          <MembersBar />
          <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{email}</span>
          <button
            onClick={async () => {
              await logout().catch(() => undefined);
              router.replace('/login');
            }}
            style={{
              background: 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text)',
              cursor: 'pointer',
              padding: '0.35rem 0.7rem',
              fontSize: '0.82rem',
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <Sidebar />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <RequestBuilder />
          <ResponseViewer />
        </main>
      </div>
    </div>
  );
}
