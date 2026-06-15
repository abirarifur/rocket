'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { useResolvedUrl } from '@/lib/useResolvedUrl';
import { SaveButton } from './SaveButton';

interface Msg {
  dir: 'in' | 'out' | 'sys';
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

/**
 * Full-panel WebSocket request. The connection is opened directly by the browser
 * (long-lived sockets can't go through the HTTP /send proxy); the URL supports
 * {{variables}} from the active environment/collection, just like HTTP requests.
 */
export function WebSocketPanel() {
  const { draft, updateDraft } = useApp();
  const [status, setStatus] = useState<'closed' | 'connecting' | 'open'>('closed');
  const [outgoing, setOutgoing] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const url = draft?.url ?? '';
  const resolvedUrl = useResolvedUrl(url);

  const log = (dir: Msg['dir'], text: string) => setMsgs((m) => [...m, { dir, text, at: Date.now() }]);

  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, [msgs.length]);
  // Close the socket when the panel unmounts (tab closed / switched away).
  useEffect(() => () => wsRef.current?.close(), []);

  if (!draft) return null;

  function connect() {
    try {
      setStatus('connecting');
      const ws = new WebSocket(resolvedUrl);
      wsRef.current = ws;
      ws.onopen = () => (setStatus('open'), log('sys', `connected to ${resolvedUrl}`));
      ws.onmessage = (e) => log('in', typeof e.data === 'string' ? e.data : '[binary frame]');
      ws.onclose = () => (setStatus('closed'), log('sys', 'connection closed'));
      ws.onerror = () => log('sys', 'connection error');
    } catch (e) {
      setStatus('closed');
      log('sys', e instanceof Error ? e.message : 'failed to connect');
    }
  }
  function send() {
    if (wsRef.current?.readyState === WebSocket.OPEN && outgoing) {
      wsRef.current.send(outgoing);
      log('out', outgoing);
      setOutgoing('');
    }
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
            color: 'var(--accent)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '0.5rem 0.6rem',
          }}
        >
          WS
        </span>
        <input
          style={{ ...input, flex: 1 }}
          value={url}
          placeholder="wss://example.com/socket  (supports {{variables}})"
          disabled={status !== 'closed'}
          onChange={(e) => updateDraft({ url: e.target.value })}
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
          <button onClick={() => wsRef.current?.close()} style={{ ...input, cursor: 'pointer', padding: '0 1.2rem' }}>
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
        {msgs.length === 0 && <span style={{ color: 'var(--muted)' }}>No messages yet. Connect and send a frame.</span>}
        {msgs.map((m, i) => (
          <div key={i} style={{ color: color[m.dir], padding: '0.1rem 0' }}>
            {m.dir === 'in' ? '← ' : m.dir === 'out' ? '→ ' : '• '}
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Composer */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.75rem 1rem' }}>
        <button onClick={() => setMsgs([])} title="Clear log" style={{ ...input, cursor: 'pointer', padding: '0 0.7rem' }} className="inline-flex items-center">
          <Trash2 size={15} />
        </button>
        <input
          style={{ ...input, flex: 1 }}
          value={outgoing}
          onChange={(e) => setOutgoing(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Message to send"
          disabled={status !== 'open'}
        />
        <button
          onClick={send}
          disabled={status !== 'open' || !outgoing}
          style={{ ...input, cursor: 'pointer', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 700, padding: '0 1.2rem', opacity: status === 'open' && outgoing ? 1 : 0.5 }}
          className="inline-flex items-center gap-1.5"
        >
          <Send size={14} /> Send
        </button>
      </div>
    </div>
  );
}
