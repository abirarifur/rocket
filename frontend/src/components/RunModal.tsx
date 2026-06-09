'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/appStore';
import { Modal } from './Modal';
import * as runsApi from '@/lib/runs-api';
import type { CollectionRun } from '@/lib/runs-api';

const ctrl: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.45rem 0.6rem',
  fontSize: '0.85rem',
};

export function RunModal({
  collectionId,
  collectionName,
  onClose,
}: {
  collectionId: string;
  collectionName: string;
  onClose: () => void;
}) {
  const { environments, activeEnvironmentId } = useApp();
  const [envId, setEnvId] = useState<string | null>(activeEnvironmentId);
  const [iterations, setIterations] = useState(1);
  const [dataType, setDataType] = useState<'none' | 'json' | 'csv'>('none');
  const [dataContent, setDataContent] = useState('');
  const [run, setRun] = useState<CollectionRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => void (pollRef.current && clearInterval(pollRef.current)), []);

  async function start() {
    setBusy(true);
    setError(null);
    setRun(null);
    try {
      const created = await runsApi.startRun(collectionId, {
        environmentId: envId,
        iterations,
        data: dataType === 'none' ? null : { type: dataType, content: dataContent },
      });
      setRun(created);
      pollRef.current = setInterval(async () => {
        const latest = await runsApi.getRun(created.id);
        setRun(latest);
        if (latest.status === 'COMPLETED' || latest.status === 'FAILED') {
          if (pollRef.current) clearInterval(pollRef.current);
          setBusy(false);
        }
      }, 800);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Run failed');
      setBusy(false);
    }
  }

  const running = busy || run?.status === 'QUEUED' || run?.status === 'RUNNING';

  return (
    <Modal title={`Run · ${collectionName}`} onClose={onClose} width={680}>
      {!run && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            Environment
            <select
              value={envId ?? ''}
              onChange={(e) => setEnvId(e.target.value || null)}
              style={{ ...ctrl, width: '100%', marginTop: 4 }}
            >
              <option value="">No environment</option>
              {environments.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            Iterations (ignored when a data file is provided)
            <input
              type="number"
              min={1}
              max={100}
              value={iterations}
              onChange={(e) => setIterations(Math.max(1, Number(e.target.value)))}
              style={{ ...ctrl, width: '100%', marginTop: 4 }}
            />
          </label>
          <label style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            Data file
            <select
              value={dataType}
              onChange={(e) => setDataType(e.target.value as 'none' | 'json' | 'csv')}
              style={{ ...ctrl, width: '100%', marginTop: 4 }}
            >
              <option value="none">None</option>
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </label>
          {dataType !== 'none' && (
            <textarea
              style={{ ...ctrl, minHeight: 110, fontFamily: 'ui-monospace, monospace' }}
              value={dataContent}
              onChange={(e) => setDataContent(e.target.value)}
              placeholder={dataType === 'csv' ? 'user,role\nalice,admin\nbob,viewer' : '[{"user":"alice"},{"user":"bob"}]'}
            />
          )}
          {error && <p style={{ color: 'var(--bad)', fontSize: '0.82rem' }}>{error}</p>}
          <button
            onClick={start}
            disabled={busy}
            style={{ ...ctrl, cursor: 'pointer', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 600 }}
          >
            Run collection
          </button>
        </div>
      )}

      {run && (
        <div>
          <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ fontWeight: 700, color: run.status === 'FAILED' ? 'var(--bad)' : 'var(--text)' }}>
              {running ? '⏳ ' : ''}
              {run.status}
            </span>
            <span style={{ color: 'var(--ok)', fontSize: '0.85rem' }}>✓ {run.passed} passed</span>
            <span style={{ color: 'var(--bad)', fontSize: '0.85rem' }}>✗ {run.failed} failed</span>
            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
              {run.iterations} iteration(s) · {run.totalRequests} requests
            </span>
            <button onClick={() => setRun(null)} style={{ ...ctrl, marginLeft: 'auto', cursor: 'pointer' }}>
              New run
            </button>
          </div>
          {run.error && <p style={{ color: 'var(--bad)' }}>{run.error}</p>}
          {run.report.map((it) => (
            <div key={it.iteration} style={{ marginBottom: '0.75rem' }}>
              <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginBottom: 4 }}>
                ITERATION {it.iteration}
              </div>
              {it.requests.map((r, i) => (
                <div key={i} style={{ borderLeft: `3px solid ${r.ok ? 'var(--ok)' : 'var(--bad)'}`, padding: '0.3rem 0.6rem', marginBottom: 4 }}>
                  <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.85rem' }}>
                    <strong>{r.name}</strong>
                    <span style={{ color: 'var(--muted)' }}>{r.status ?? r.error}</span>
                    {r.timeMs != null && <span style={{ color: 'var(--muted)' }}>{r.timeMs}ms</span>}
                  </div>
                  {r.tests.map((t, j) => (
                    <div key={j} style={{ fontSize: '0.78rem', color: t.passed ? 'var(--ok)' : 'var(--bad)' }}>
                      {t.passed ? '✓' : '✗'} {t.name}
                      {t.error && <span style={{ color: 'var(--muted)' }}> — {t.error}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
