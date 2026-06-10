'use client';

import { Plus } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { canAdmin } from '@/lib/teams-api';
import { promptDialog } from './dialogs';

const ctrl: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.35rem 0.6rem',
  fontSize: '0.82rem',
};

const ROLE_BADGE: Record<string, string> = {
  OWNER: 'var(--accent)',
  ADMIN: '#58a6ff',
  EDITOR: '#3fb950',
  VIEWER: 'var(--muted)',
};

export function WorkspaceBar() {
  const { workspaces, workspaceId, role, switchWorkspace, createTeamWorkspace } = useApp();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <select
        value={workspaceId ?? ''}
        onChange={(e) => void switchWorkspace(e.target.value)}
        style={ctrl}
        title="Active workspace"
      >
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.teamName} / {w.name}
          </option>
        ))}
      </select>
      {role && (
        <span
          style={{
            fontSize: '0.66rem',
            fontWeight: 700,
            color: ROLE_BADGE[role] ?? 'var(--muted)',
            border: `1px solid ${ROLE_BADGE[role] ?? 'var(--muted)'}`,
            borderRadius: 999,
            padding: '0.05rem 0.45rem',
          }}
        >
          {role}
        </span>
      )}
      {canAdmin(role) && (
        <button
          onClick={async () => {
            const name = await promptDialog({ title: 'New team workspace', label: 'Workspace name', defaultValue: 'Team Workspace', placeholder: 'Team Workspace' });
            if (name) void createTeamWorkspace(name);
          }}
          style={{ ...ctrl, cursor: 'pointer', color: 'var(--accent)' }}
          className="inline-flex items-center"
          title="New team workspace"
        >
          <Plus size={15} />
        </button>
      )}
    </div>
  );
}
