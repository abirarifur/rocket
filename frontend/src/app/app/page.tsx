'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMe, logout } from '@/lib/auth-api';
import { useApp } from '@/store/appStore';
import { Sidebar } from '@/components/Sidebar';
import { TabBar } from '@/components/TabBar';
import { RequestBuilder } from '@/components/RequestBuilder';
import { ResponseViewer } from '@/components/ResponseViewer';
import { EnvironmentBar } from '@/components/EnvironmentBar';
import { WorkspaceBar } from '@/components/WorkspaceBar';
import { MembersBar } from '@/components/MembersBar';
import { GlobalsBar } from '@/components/GlobalsBar';
import { PresenceBar } from '@/components/PresenceBar';
import { HistoryBar } from '@/components/HistoryBar';
import { CookiesBar } from '@/components/CookiesBar';
import { WebSocketBar } from '@/components/WebSocketBar';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DialogHost } from '@/components/dialogs';

export default function AppPage() {
  const router = useRouter();
  const { init, setMe, connectRealtime } = useApp();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(300);

  // Restore persisted sidebar width.
  useEffect(() => {
    const saved = Number(localStorage.getItem('rocket-sidebar-w'));
    if (saved >= 220 && saved <= 560) setSidebarWidth(saved);
  }, []);

  // Draggable sidebar resizer.
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const onMove = (ev: MouseEvent) => {
      const w = Math.min(560, Math.max(220, ev.clientX));
      setSidebarWidth(w);
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      setSidebarWidth((w) => {
        localStorage.setItem('rocket-sidebar-w', String(w));
        return w;
      });
    };
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    fetchMe().then(async (me) => {
      if (!me) {
        router.replace('/login');
        return;
      }
      setEmail(me.email);
      setMe(me.id);
      await init(me.defaultWorkspace?.id);
      connectRealtime();
      setReady(true);
    });
  }, [init, router, setMe, connectRealtime]);

  // Global keyboard shortcuts: send, save, focus search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        void useApp.getState().send();
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        void useApp.getState().saveActive();
      } else if (e.key.toLowerCase() === 'k') {
        e.preventDefault();
        window.dispatchEvent(new Event('rocket:focus-search'));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
          <PresenceBar />
          <EnvironmentBar />
          <GlobalsBar />
          <HistoryBar />
          <CookiesBar />
          <WebSocketBar />
          <MembersBar />
          <ThemeToggle />
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
        <div style={{ width: sidebarWidth }} className="shrink-0 border-r border-border">
          <Sidebar />
        </div>
        <div
          onMouseDown={startResize}
          className="w-1 shrink-0 cursor-col-resize bg-transparent transition-colors hover:bg-primary/40"
          style={{ marginLeft: -2, marginRight: -2, zIndex: 10 }}
          title="Drag to resize"
        />
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <TabBar />
          <RequestBuilder />
          <ResponseViewer />
        </main>
      </div>
      <DialogHost />
    </div>
  );
}
