'use client';

import { useState } from 'react';
import { useApp } from '@/store/appStore';
import { importCurl, type ImportType } from '@/lib/interop-api';
import { Modal } from './Modal';

const ctrl: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.45rem 0.6rem',
  fontSize: '0.85rem',
};

type Kind = ImportType | 'curl';

export function ImportModal({ onClose }: { onClose: () => void }) {
  const { collections, activeCollectionId, importDocument, importCurlInto } = useApp();
  const [kind, setKind] = useState<Kind>('postman');
  const [content, setContent] = useState('');
  const [target, setTarget] = useState<string | null>(activeCollectionId ?? collections[0]?.id ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      if (kind === 'curl') {
        if (!target) throw new Error('Select a collection to import the request into');
        const req = await importCurl(content);
        await importCurlInto(target, req);
      } else {
        await importDocument(kind, content);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Import" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select value={kind} onChange={(e) => setKind(e.target.value as Kind)} style={{ ...ctrl, flex: 1 }}>
            <option value="postman">Postman Collection v2.1</option>
            <option value="openapi">OpenAPI 3.x (JSON)</option>
            <option value="har">HAR</option>
            <option value="curl">cURL command</option>
          </select>
          {kind === 'curl' && (
            <select value={target ?? ''} onChange={(e) => setTarget(e.target.value || null)} style={{ ...ctrl, flex: 1 }}>
              <option value="">Into collection…</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <textarea
          style={{ ...ctrl, minHeight: 220, fontFamily: 'ui-monospace, monospace' }}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            kind === 'curl'
              ? "curl -X POST https://api.example.com -H 'Content-Type: application/json' -d '{...}'"
              : 'Paste the JSON document here…'
          }
        />
        {error && <p style={{ color: 'var(--bad)', fontSize: '0.82rem', margin: 0 }}>{error}</p>}
        <button
          onClick={run}
          disabled={busy || !content.trim()}
          style={{ ...ctrl, cursor: 'pointer', background: 'var(--accent)', color: '#fff', border: 'none', fontWeight: 600 }}
        >
          {busy ? 'Importing…' : 'Import'}
        </button>
      </div>
    </Modal>
  );
}
