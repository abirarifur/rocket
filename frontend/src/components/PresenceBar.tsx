'use client';

import { useApp } from '@/store/appStore';

const COLORS = ['#ff6b35', '#58a6ff', '#3fb950', '#a371f7', '#d29922', '#f85149'];

function initials(email: string, name: string | null): string {
  if (name?.trim()) return name.trim().slice(0, 2).toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

/** Avatars of everyone currently online in the active workspace. */
export function PresenceBar() {
  const { presence, meId } = useApp();
  if (presence.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {presence.map((p, i) => (
        <div
          key={p.userId}
          title={`${p.name ?? p.email}${p.userId === meId ? ' (you)' : ''}`}
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: COLORS[i % COLORS.length],
            color: '#fff',
            fontSize: '0.65rem',
            fontWeight: 700,
            display: 'grid',
            placeItems: 'center',
            marginLeft: i === 0 ? 0 : -8,
            border: '2px solid var(--bg)',
            boxShadow: p.userId === meId ? '0 0 0 2px var(--accent)' : 'none',
          }}
        >
          {initials(p.email, p.name)}
        </div>
      ))}
    </div>
  );
}
