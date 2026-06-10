'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/store/appStore';
import { Modal } from './Modal';
import * as ops from '@/lib/ops-api';

const ctrl: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.4rem 0.6rem',
  fontSize: '0.82rem',
};
const primary: React.CSSProperties = { ...ctrl, background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 };

type Tab = 'mock' | 'monitor' | 'docs';

export function OpsModal({
  collectionId,
  collectionName,
  onClose,
}: {
  collectionId: string;
  collectionName: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('mock');
  return (
    <Modal title={`Deploy · ${collectionName}`} onClose={onClose} width={640}>
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1rem' }}>
        {(['mock', 'monitor', 'docs'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              color: tab === t ? 'var(--text)' : 'var(--muted)',
              cursor: 'pointer',
              padding: '0.4rem 0',
              textTransform: 'capitalize',
            }}
          >
            {t === 'mock' ? 'Mock Server' : t === 'monitor' ? 'Monitor' : 'Docs'}
          </button>
        ))}
      </div>
      {tab === 'mock' && <MockTab collectionId={collectionId} />}
      {tab === 'monitor' && <MonitorTab collectionId={collectionId} />}
      {tab === 'docs' && <DocsTab collectionId={collectionId} />}
    </Modal>
  );
}

function MockTab({ collectionId }: { collectionId: string }) {
  const { workspaceId } = useApp();
  const [mocks, setMocks] = useState<ops.MockServer[]>([]);
  const reload = () =>
    workspaceId &&
    ops.listMocks(workspaceId).then((all) => setMocks(all.filter((m) => m.collectionId === collectionId)));
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, collectionId]);

  return (
    <div>
      <button style={primary} onClick={async () => (await ops.createMock(collectionId), reload())}>
        + Create mock server
      </button>
      {mocks.map((m) => (
        <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem', marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <strong>{m.name}</strong>
            <span style={{ color: m.enabled ? 'var(--ok)' : 'var(--muted)', fontSize: '0.75rem' }}>
              {m.enabled ? 'enabled' : 'disabled'}
            </span>
            <button
              style={{ ...ctrl, marginLeft: 'auto', cursor: 'pointer' }}
              onClick={async () => (await ops.deleteMock(m.id), reload())}
            >
              Delete
            </button>
          </div>
          <CopyRow label="Base URL" value={ops.mockUrl(m.id)} />
          <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
            {m.routes.map((r, i) => (
              <div key={i}>
                {r.method} {r.path} → {r.status}
              </div>
            ))}
          </div>
        </div>
      ))}
      {mocks.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No mock server yet.</p>}
    </div>
  );
}

function MonitorTab({ collectionId }: { collectionId: string }) {
  const { workspaceId, environments } = useApp();
  const [monitors, setMonitors] = useState<ops.Monitor[]>([]);
  const [interval, setIntervalMin] = useState(60);
  const [envId, setEnvId] = useState<string | null>(null);
  const [webhook, setWebhook] = useState('');
  const [runs, setRuns] = useState<Record<string, ops.MonitorRun[]>>({});

  const reload = async () => {
    if (!workspaceId) return;
    const all = (await ops.listMonitors(workspaceId)).filter((m) => m.collectionId === collectionId);
    setMonitors(all);
    for (const m of all) ops.monitorRuns(m.id).then((r) => setRuns((s) => ({ ...s, [m.id]: r })));
  };
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, collectionId]);

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>Every</span>
        <input type="number" min={1} value={interval} onChange={(e) => setIntervalMin(Number(e.target.value))} style={{ ...ctrl, width: 70 }} />
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>min</span>
        <select value={envId ?? ''} onChange={(e) => setEnvId(e.target.value || null)} style={ctrl}>
          <option value="">No env</option>
          {environments.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        <input placeholder="webhook URL on failure (optional)" value={webhook} onChange={(e) => setWebhook(e.target.value)} style={{ ...ctrl, flex: 1, minWidth: 160 }} />
        <button
          style={primary}
          onClick={async () => {
            await ops.createMonitor({ collectionId, intervalMinutes: interval, environmentId: envId, webhookUrl: webhook || null });
            setWebhook('');
            reload();
          }}
        >
          + Monitor
        </button>
      </div>
      {monitors.map((m) => (
        <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.75rem', marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <strong>{m.name}</strong>
            <span style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>every {m.intervalMinutes}m</span>
            <button style={{ ...ctrl, cursor: 'pointer' }} onClick={async () => (await ops.updateMonitor(m.id, { enabled: !m.enabled }), reload())}>
              {m.enabled ? 'Disable' : 'Enable'}
            </button>
            <button style={{ ...ctrl, cursor: 'pointer' }} onClick={async () => (await ops.deleteMonitor(m.id), reload())}>
              Delete
            </button>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
            {(runs[m.id] ?? []).slice(0, 5).map((r) => (
              <div key={r.id}>
                {new Date(r.createdAt).toLocaleTimeString()} · {r.status} ·{' '}
                <span style={{ color: 'var(--ok)' }}>{r.passed}✓</span> <span style={{ color: 'var(--bad)' }}>{r.failed}✗</span>
              </div>
            ))}
          </div>
        </div>
      ))}
      {monitors.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No monitors yet.</p>}
    </div>
  );
}

function DocsTab({ collectionId }: { collectionId: string }) {
  const url = ops.docsUrl(collectionId);
  return (
    <div>
      <p style={{ fontSize: '0.85rem' }}>Public documentation is generated from this collection.</p>
      <CopyRow label="Docs URL" value={url} />
      <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: '0.5rem' }}>
        The docs are viewable by anyone only when this collection&apos;s workspace visibility is set to
        <strong> PUBLIC</strong>. <a href={url} target="_blank" rel="noreferrer">Open docs ↗</a>
      </p>
    </div>
  );
}

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.5rem' }}>
      <span style={{ fontSize: '0.72rem', color: 'var(--muted)', width: 64 }}>{label}</span>
      <code style={{ ...ctrl, flex: 1, overflow: 'auto', whiteSpace: 'nowrap' }}>{value}</code>
      <button
        style={{ ...ctrl, cursor: 'pointer' }}
        onClick={() => {
          void navigator.clipboard.writeText(value);
          setCopied(true);
        }}
      >
        {copied ? '✓' : 'Copy'}
      </button>
    </div>
  );
}
