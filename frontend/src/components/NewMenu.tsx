'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Boxes,
  GitGraph,
  Globe,
  Layers,
  Plus,
  Plug,
  Radio,
  Network,
  Sparkles,
  Webhook,
  Workflow,
} from 'lucide-react';
import { useApp } from '@/store/appStore';
import { promptDialog } from './dialogs';

type Item =
  | { kind: 'item'; key: string; label: string; icon: React.ReactNode; onClick: () => void; soon?: boolean }
  | { kind: 'divider' };

/**
 * Postman-style "New" dropdown. Wires up the request types Rocket can already do
 * (HTTP, GraphQL, WebSocket) plus Collection/Environment; the remaining protocol
 * clients are listed as "soon" so the menu mirrors Postman without dead ends.
 */
export function NewMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { newRequestTab, createCollection, openEnvironmentTab } = useApp();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  const close = () => setOpen(false);
  const run = (fn: () => void) => () => {
    fn();
    close();
  };

  const items: Item[] = [
    {
      kind: 'item',
      key: 'http',
      label: 'HTTP',
      icon: <Globe size={15} style={{ color: '#ff6b35' }} />,
      onClick: run(() => newRequestTab({ name: 'New Request' })),
    },
    {
      kind: 'item',
      key: 'graphql',
      label: 'GraphQL',
      icon: <GitGraph size={15} style={{ color: '#e535ab' }} />,
      onClick: run(() =>
        newRequestTab({
          name: 'GraphQL Request',
          kind: 'graphql',
          method: 'POST',
          body: { mode: 'graphql', graphql: { query: '', variables: '' } },
        }),
      ),
    },
    {
      kind: 'item',
      key: 'websocket',
      label: 'WebSocket',
      icon: <Plug size={15} style={{ color: '#3fb950' }} />,
      onClick: run(() =>
        newRequestTab({ name: 'New WebSocket', kind: 'websocket', url: 'wss://echo.websocket.events' }),
      ),
    },
    {
      kind: 'item',
      key: 'socketio',
      label: 'Socket.IO',
      icon: <Radio size={15} style={{ color: '#dd1b16' }} />,
      onClick: run(() =>
        newRequestTab({ name: 'New Socket.IO', kind: 'socketio', url: 'http://localhost:3000' }),
      ),
    },
    { kind: 'item', key: 'grpc', label: 'gRPC', icon: <Network size={15} />, onClick: close, soon: true },
    { kind: 'item', key: 'mqtt', label: 'MQTT', icon: <Radio size={15} />, onClick: close, soon: true },
    { kind: 'item', key: 'mcp', label: 'MCP', icon: <Sparkles size={15} />, onClick: close, soon: true },
    { kind: 'divider' },
    {
      kind: 'item',
      key: 'collection',
      label: 'Collection',
      icon: <Box size={15} style={{ color: '#ff6b35' }} />,
      onClick: run(async () => {
        const name = await promptDialog({
          title: 'New collection',
          label: 'Collection name',
          defaultValue: 'My Collection',
          placeholder: 'My Collection',
        });
        if (name) void createCollection(name);
      }),
    },
    {
      kind: 'item',
      key: 'environment',
      label: 'Environment',
      icon: <Layers size={15} style={{ color: '#a371f7' }} />,
      onClick: run(() => openEnvironmentTab()),
    },
    { kind: 'item', key: 'mock', label: 'Mock Server', icon: <Boxes size={15} />, onClick: close, soon: true },
    { kind: 'item', key: 'webhook', label: 'Webhook', icon: <Webhook size={15} />, onClick: close, soon: true },
    { kind: 'item', key: 'flow', label: 'Flow', icon: <Workflow size={15} />, onClick: close, soon: true },
  ];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--accent)',
          cursor: 'pointer',
          padding: '0 2px',
        }}
        className="inline-flex items-center"
        title="New…"
      >
        <Plus size={18} />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 6,
            minWidth: 200,
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
            padding: '0.35rem',
            zIndex: 50,
          }}
        >
          {items.map((it, i) =>
            it.kind === 'divider' ? (
              <div key={`d${i}`} style={{ height: 1, background: 'var(--border)', margin: '0.35rem 0' }} />
            ) : (
              <button
                key={it.key}
                onClick={it.onClick}
                disabled={it.soon}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 6,
                  color: it.soon ? 'var(--muted)' : 'var(--text)',
                  cursor: it.soon ? 'default' : 'pointer',
                  padding: '0.4rem 0.5rem',
                  fontSize: '0.85rem',
                  textAlign: 'left',
                }}
                className={it.soon ? '' : 'hover:bg-accent/40'}
                title={it.soon ? 'Coming soon' : undefined}
              >
                <span style={{ display: 'inline-flex', width: 18, color: 'var(--muted)' }}>{it.icon}</span>
                <span style={{ flex: 1 }}>{it.label}</span>
                {it.soon && (
                  <span
                    style={{
                      fontSize: '0.6rem',
                      color: 'var(--muted)',
                      border: '1px solid var(--border)',
                      borderRadius: 999,
                      padding: '0.02rem 0.35rem',
                    }}
                  >
                    soon
                  </span>
                )}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
