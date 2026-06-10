'use client';

import { Layers } from 'lucide-react';
import { useApp } from '@/store/appStore';

const ctrl: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.35rem 0.6rem',
  fontSize: '0.82rem',
};

/** Active-environment switcher + a button that opens the Environments editor tab. */
export function EnvironmentBar() {
  const { environments, activeEnvironmentId, setActiveEnvironment, openEnvironmentTab } = useApp();

  return (
    <>
      <select
        value={activeEnvironmentId ?? ''}
        onChange={(e) => setActiveEnvironment(e.target.value || null)}
        style={ctrl}
        title="Active environment"
      >
        <option value="">No environment</option>
        {environments.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
      <button
        onClick={openEnvironmentTab}
        style={{ ...ctrl, cursor: 'pointer' }}
        className="inline-flex items-center gap-1.5"
        title="Open the Environments editor"
      >
        <Layers size={15} /> Environments
      </button>
    </>
  );
}
