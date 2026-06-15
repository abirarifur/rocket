'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Send, Trash2 } from 'lucide-react';
import type { SocketIoConfig } from '@rocket/types';
import { useApp } from '@/store/appStore';
import { useResolvedUrl } from '@/lib/useResolvedUrl';
import { SaveButton } from './SaveButton';

interface Msg {
  dir: 'in' | 'out' | 'sys';
  event?: string;
  text: string;
  at: number;
}

const input: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.5rem 0.6rem',
  fontSize: '0.9rem',
};

const STATUS_COLOR: Record<string, string> = {
  open: 'var(--ok)',
  connecting: 'var(--accent)',
  closed: 'var(--muted)',
};

const DEFAULT_CFG: SocketIoConfig = { event: 'message', message: '', listeners: [], path: '/socket.io' };

/**
 * Full-panel Socket.IO client. Connects from the browser with socket.io-client,
 * emits an event + JSON/text payload, and logs every event the server emits
 * (via onAny). The URL supports {{variables}} like other request types.
 */
export function SocketIOPanel() {
  const { draft, updateDraft } = useApp();
  const [status, setStatus] = useState<'closed' | 'connecting' | 'open'>('closed');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const url = draft?.url ?? '';
  const resolvedUrl = useResolvedUrl(url);
  const cfg: SocketIoConfig = { ...DEFAULT_CFG, ...(draft?.socketio ?? {}) };

  const log = (m: Omit<Msg, 'at'>) => setMsgs((prev) => [...prev, { ...m, at: Date.now() }]);
  const setCfg = (patch: Partial<SocketIoConfig>) => updateDraft({ socketio: { ...cfg, ...patch } });

  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, [msgs.length]);
  useEffect(
    () => () => {
      socketRef.current?.disconnect();
    },
    [],
  );

  if (!draft) return null;

  function connect() {
    try {
      setStatus('connecting');
      const socket = io(resolvedUrl, {
        path: cfg.path || '/socket.io',
        transports: ['websocket', 'polling'],
        autoConnect: false,
        reconnection: false,
      });
      socketRef.current = socket;
      socket.on('connect', () => (setStatus('open'), log({ dir: 'sys', text: `connected (${socket.id})` })));
      socket.on('disconnect', (reason) => (setStatus('closed'), log({ dir: 'sys', text: `disconnected: ${reason}` })));
      socket.on('connect_error', (err) => (setStatus('closed'), log({ dir: 'sys', text: `connect error: ${err.message}` })));
      socket.onAny((event, ...args) => {
        const payload = args.length === 1 ? args[0] : args;
        log({ dir: 'in', event, text: typeof payload === 'string' ? payload : JSON.stringify(payload) });
      });
      socket.connect();
    } catch (e) {
      setStatus('closed');
      log({ dir: 'sys', text: e instanceof Error ? e.message : 'failed to connect' });
    }
  }

  function emit() {
    const socket = socketRef.current;
    if (!socket?.connected || !cfg.event) return;
    let payload: unknown = cfg.message;
    if (cfg.message.trim()) {
      try {
        payload = JSON.parse(cfg.message);
      } catch {
        payload = cfg.message; // fall back to raw string
      }
    }
    socket.emit(cfg.event, payload);
    log({ dir: 'out', event: cfg.event, text: typeof payload === 'string' ? payload : JSON.stringify(payload) });
  }

  const color = { in: 'var(--ok)', out: 'var(--accent)', sys: 'var(--muted)' };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Connection bar */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '1rem', alignItems: 'center' }}>
        <span
          style={{
            fontWeight: 700,
            fontSize: '0.72rem',
            color: '#dd1b16',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '0.5rem 0.6rem',
          }}
        >
          IO
        </span>
        <input
          style={{ ...input, flex: 1 }}
          value={url}
          placeholder="http://localhost:3000  (supports {{variables}})"
          disabled={status !== 'closed'}
          onChange={(e) => updateDraft({ url: e.target.value })}
        />
        <input
          style={{ ...input, width: 150 }}
          value={cfg.path}
          placeholder="/socket.io"
          disabled={status !== 'closed'}
          onChange={(e) => setCfg({ path: e.target.value })}
          title="Socket.IO path"
        />
        {status === 'closed' ? (
          <button
            onClick={connect}
            disabled={!resolvedUrl}
            style={{ ...input, cursor: 'pointer', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, padding: '0 1.4rem', opacity: resolvedUrl ? 1 : 0.5 }}
          >
            Connect
          </button>
        ) : (
          <button onClick={() => socketRef.current?.disconnect()} style={{ ...input, cursor: 'pointer', padding: '0 1.2rem' }}>
            {status === 'connecting' ? 'Connecting…' : 'Disconnect'}
          </button>
        )}
        <SaveButton style={{ padding: '0 0.9rem', height: '100%' }} />
      </div>

      <div style={{ padding: '0 1rem 0.5rem', fontSize: '0.76rem', color: 'var(--muted)' }}>
        <span style={{ color: STATUS_COLOR[status] }}>● {status}</span>
        {url !== resolvedUrl && (
          <>
            {' · '}
            <code style={{ color: 'var(--text)' }}>{resolvedUrl}</code>
          </>
        )}
      </div>

      {/* Message log */}
      <div style={{ flex: 1, overflowY: 'auto', margin: '0 1rem', border: '1px solid var(--border)', borderRadius: 6, padding: '0.6rem', background: 'var(--bg)', fontFamily: 'ui-monospace, monospace', fontSize: '0.8rem', minHeight: 0 }}>
        {msgs.length === 0 && <span style={{ color: 'var(--muted)' }}>No events yet. Connect, then emit an event.</span>}
        {msgs.map((m, i) => (
          <div key={i} style={{ color: color[m.dir], padding: '0.1rem 0' }}>
            {m.dir === 'in' ? '← ' : m.dir === 'out' ? '→ ' : '• '}
            {m.event && <strong style={{ color: 'var(--text)' }}>{m.event}: </strong>}
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Emit composer */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem', alignItems: 'flex-start' }}>
        <button onClick={() => setMsgs([])} title="Clear log" style={{ ...input, cursor: 'pointer', padding: '0.5rem 0.7rem' }} className="inline-flex items-center">
          <Trash2 size={15} />
        </button>
        <input
          style={{ ...input, width: 180 }}
          value={cfg.event}
          onChange={(e) => setCfg({ event: e.target.value })}
          placeholder="event name"
        />
        <textarea
          style={{ ...input, flex: 1, minHeight: 40, fontFamily: 'ui-monospace, monospace' }}
          value={cfg.message}
          onChange={(e) => setCfg({ message: e.target.value })}
          placeholder='payload — JSON or text, e.g. { "hello": "world" }'
        />
        <button
          onClick={emit}
          disabled={status !== 'open' || !cfg.event}
          style={{ ...input, cursor: 'pointer', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, padding: '0.5rem 1.2rem', opacity: status === 'open' && cfg.event ? 1 : 0.5 }}
          className="inline-flex items-center gap-1.5"
        >
          <Send size={14} /> Emit
        </button>
      </div>
    </div>
  );
}
