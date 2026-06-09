'use client';

import { useState } from 'react';
import { useApp } from '@/store/appStore';

function prettyMaybe(body: string, contentType?: string): string {
  if (contentType?.includes('json') || /^[[{]/.test(body.trim())) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      /* fall through */
    }
  }
  return body;
}

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function ResponseViewer() {
  const { response, sending, sendError, testResults, scriptLogs, scriptError } = useApp();
  const [tab, setTab] = useState<'body' | 'headers' | 'tests'>('body');

  if (sending) {
    return <Panel><span style={{ color: 'var(--muted)' }}>Sending…</span></Panel>;
  }
  if (sendError) {
    return (
      <Panel>
        <span style={{ color: 'var(--bad)' }}>⚠ {sendError}</span>
      </Panel>
    );
  }
  if (!response) {
    return (
      <Panel>
        <span style={{ color: 'var(--muted)' }}>Send a request to see the response.</span>
      </Panel>
    );
  }

  const ok = response.status >= 200 && response.status < 400;
  const ct = response.headers['content-type'];
  const passedCount = testResults.filter((t) => t.passed).length;

  return (
    <div style={{ borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1 }}>
      <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', padding: '0.6rem 1rem' }}>
        <span style={{ color: ok ? 'var(--ok)' : 'var(--bad)', fontWeight: 700 }}>
          {response.status} {response.statusText}
        </span>
        <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{response.timeMs.toFixed(0)} ms</span>
        <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{fmtSize(response.sizeBytes)}</span>
        {response.truncated && (
          <span style={{ color: 'var(--accent)', fontSize: '0.78rem' }}>truncated</span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          <TabBtn active={tab === 'body'} onClick={() => setTab('body')}>Body</TabBtn>
          <TabBtn active={tab === 'headers'} onClick={() => setTab('headers')}>
            Headers ({Object.keys(response.headers).length})
          </TabBtn>
          {(testResults.length > 0 || scriptLogs.length > 0 || scriptError) && (
            <TabBtn active={tab === 'tests'} onClick={() => setTab('tests')}>
              Tests {testResults.length > 0 && `(${passedCount}/${testResults.length})`}
            </TabBtn>
          )}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '0 1rem 1rem' }}>
        {tab === 'body' && <pre style={preStyle}>{prettyMaybe(response.body, ct)}</pre>}
        {tab === 'headers' && (
          <pre style={preStyle}>
            {Object.entries(response.headers)
              .map(([k, v]) => `${k}: ${v}`)
              .join('\n')}
          </pre>
        )}
        {tab === 'tests' && (
          <div>
            {scriptError && (
              <p style={{ color: 'var(--bad)', fontSize: '0.82rem' }}>⚠ {scriptError}</p>
            )}
            {testResults.map((t, i) => (
              <div
                key={i}
                style={{ display: 'flex', gap: '0.5rem', padding: '0.3rem 0', fontSize: '0.85rem' }}
              >
                <span style={{ color: t.passed ? 'var(--ok)' : 'var(--bad)', fontWeight: 700 }}>
                  {t.passed ? 'PASS' : 'FAIL'}
                </span>
                <span>{t.name}</span>
                {t.error && <span style={{ color: 'var(--muted)' }}>— {t.error}</span>}
              </div>
            ))}
            {scriptLogs.length > 0 && (
              <>
                <p style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: '1rem' }}>CONSOLE</p>
                <pre style={preStyle}>{scriptLogs.join('\n')}</pre>
              </>
            )}
            {testResults.length === 0 && scriptLogs.length === 0 && !scriptError && (
              <span style={{ color: 'var(--muted)' }}>No test output.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderTop: '1px solid var(--border)',
        padding: '1rem',
        flex: 1,
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {children}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        border: 'none',
        borderBottom: active ? '2px solid var(--accent)' : '2px solid transparent',
        color: active ? 'var(--text)' : 'var(--muted)',
        cursor: 'pointer',
        fontSize: '0.85rem',
        padding: '0.2rem 0',
      }}
    >
      {children}
    </button>
  );
}

const preStyle: React.CSSProperties = {
  margin: 0,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '0.82rem',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  color: 'var(--text)',
};
