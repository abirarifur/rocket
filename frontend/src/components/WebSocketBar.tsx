'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from './Modal';

const ctrl: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.4rem 0.6rem',
  fontSize: '0.85rem',
};

interface Msg {
  dir: 'in' | 'out' | 'sys';
  text: string;
  at: number;
}

/** A WebSocket connection tester (connect, send, receive). */
export function WebSocketBar() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ ...ctrl, cursor: 'pointer' }} title="WebSocket tester">
        🔌 WS
      </button>
      {open && <WsModal onClose={() => setOpen(false)} />}
    </>
  );
}

function WsModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState('wss://echo.websocket.org');
  const [status, setStatus] = useState<'closed' | 'connecting' | 'open'>('closed');
  const [draft, setDraft] = useState('');
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const log = (dir: Msg['dir'], text: string) =>
    setMsgs((m) => [...m, { dir, text, at: Date.now() }]);

  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, [msgs.length]);
  useEffect(() => () => wsRef.current?.close(), []);

  function connect() {
    try {
      setStatus('connecting');
      const ws = new WebSocket(url);
      wsRef.current = ws;
      ws.onopen = () => (setStatus('open'), log('sys', `connected to ${url}`));
      ws.onmessage = (e) => log('in', typeof e.data === 'string' ? e.data : '[binary]');
      ws.onclose = () => (setStatus('closed'), log('sys', 'connection closed'));
      ws.onerror = () => log('sys', 'connection error');
    } catch (e) {
      setStatus('closed');
      log('sys', e instanceof Error ? e.message : 'failed to connect');
    }
  }
  function disconnect() {
    wsRef.current?.close();
  }
  function send() {
    if (wsRef.current?.readyState === WebSocket.OPEN && draft) {
      wsRef.current.send(draft);
      log('out', draft);
      setDraft('');
    }
  }

  const color = { in: 'var(--ok)', out: 'var(--accent)', sys: 'var(--muted)' };

  return (
    <Modal title="WebSocket" onClose={onClose} width={620}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          style={{ ...ctrl, flex: 1 }}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="wss://example.com/socket"
          disabled={status !== 'closed'}
        />
        {status === 'closed' ? (
          <button onClick={connect} style={{ ...ctrl, cursor: 'pointer', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 600 }}>
            Connect
          </button>
        ) : (
          <button onClick={disconnect} style={{ ...ctrl, cursor: 'pointer' }}>
            {status === 'connecting' ? 'Connecting…' : 'Disconnect'}
          </button>
        )}
      </div>

      <div style={{ height: 240, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: '0.5rem', background: 'var(--bg)', fontFamily: 'ui-monospace, monospace', fontSize: '0.78rem' }}>
        {msgs.length === 0 && <span style={{ color: 'var(--muted)' }}>No messages yet.</span>}
        {msgs.map((m, i) => (
          <div key={i} style={{ color: color[m.dir] }}>
            {m.dir === 'in' ? '← ' : m.dir === 'out' ? '→ ' : '• '}
            {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
        <input
          style={{ ...ctrl, flex: 1 }}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Message to send"
          disabled={status !== 'open'}
        />
        <button onClick={send} disabled={status !== 'open' || !draft} style={{ ...ctrl, cursor: 'pointer' }}>
          Send
        </button>
      </div>
    </Modal>
  );
}
