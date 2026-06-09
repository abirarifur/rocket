'use client';

import { useState } from 'react';
import type { RequestDefinition } from '@rocket/types';
import { generateCode, LANGS, type CodeLang } from '@/lib/codegen';
import { Modal } from './Modal';

export function CodeModal({ request, onClose }: { request: RequestDefinition; onClose: () => void }) {
  const [lang, setLang] = useState<CodeLang>('curl');
  const [copied, setCopied] = useState(false);
  const code = generateCode(request, lang);

  return (
    <Modal title="Code snippet" onClose={onClose} width={680}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <select
          value={lang}
          onChange={(e) => (setLang(e.target.value as CodeLang), setCopied(false))}
          style={{
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text)',
            padding: '0.4rem 0.6rem',
            fontSize: '0.85rem',
          }}
        >
          {LANGS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(code);
            setCopied(true);
          }}
          style={{
            marginLeft: 'auto',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            cursor: 'pointer',
            padding: '0.4rem 0.9rem',
            fontSize: '0.82rem',
          }}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: '1rem',
          background: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          fontFamily: 'ui-monospace, monospace',
          fontSize: '0.8rem',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          maxHeight: '50vh',
          overflow: 'auto',
        }}
      >
        {code}
      </pre>
    </Modal>
  );
}
