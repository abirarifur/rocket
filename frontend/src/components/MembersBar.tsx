'use client';

import { useEffect, useState } from 'react';
import { useApp } from '@/store/appStore';
import { Modal } from './Modal';
import { confirmDialog } from './dialogs';
import * as teams from '@/lib/teams-api';
import { Users } from 'lucide-react';
import { canAdmin, type Member, type Role } from '@/lib/teams-api';

const ctrl: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.35rem 0.6rem',
  fontSize: '0.82rem',
};

export function MembersBar() {
  const { teamId, role } = useApp();
  const [open, setOpen] = useState(false);
  if (!teamId) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} style={{ ...ctrl, cursor: 'pointer' }} className="inline-flex items-center gap-1.5">
        <Users size={15} /> Team
      </button>
      {open && <MembersModal teamId={teamId} myRole={role} onClose={() => setOpen(false)} />}
    </>
  );
}

function MembersModal({
  teamId,
  myRole,
  onClose,
}: {
  teamId: string;
  myRole: Role | null;
  onClose: () => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('VIEWER');
  const [msg, setMsg] = useState<string | null>(null);
  const admin = canAdmin(myRole);
  const isOwner = myRole === 'OWNER';

  const reload = () => teams.listMembers(teamId).then(setMembers).catch(() => undefined);
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  async function doInvite() {
    setMsg(null);
    try {
      await teams.invite(teamId, email, inviteRole);
      setEmail('');
      setMsg(`Invitation sent to ${email}. (Dev: the accept link is printed in the API logs.)`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Invite failed');
    }
  }

  return (
    <Modal title="Team members" onClose={onClose}>
      {admin && (
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            style={{ ...ctrl, flex: 1 }}
            placeholder="invite by email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select style={ctrl} value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)}>
            <option value="VIEWER">Viewer</option>
            <option value="EDITOR">Editor</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button
            onClick={doInvite}
            disabled={!email}
            style={{ ...ctrl, cursor: 'pointer', background: 'var(--accent)', color: '#fff', border: 'none' }}
          >
            Invite
          </button>
        </div>
      )}
      {msg && <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{msg}</p>}

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <tbody>
          {members.map((m) => (
            <tr key={m.userId} style={{ borderTop: '1px solid var(--border)' }}>
              <td style={{ padding: '0.5rem 0' }}>
                {m.name ?? m.email}
                <div style={{ color: 'var(--muted)', fontSize: '0.75rem' }}>{m.email}</div>
              </td>
              <td style={{ textAlign: 'right' }}>
                {admin && m.role !== 'OWNER' ? (
                  <select
                    value={m.role}
                    onChange={async (e) => {
                      await teams.changeRole(teamId, m.userId, e.target.value as Role);
                      void reload();
                    }}
                    style={ctrl}
                  >
                    <option value="VIEWER">Viewer</option>
                    <option value="EDITOR">Editor</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                ) : (
                  <span style={{ color: 'var(--muted)' }}>{m.role}</span>
                )}
              </td>
              <td style={{ textAlign: 'right', width: 90 }}>
                {isOwner && m.role !== 'OWNER' && (
                  <button
                    title="Transfer ownership"
                    onClick={async () => {
                      if (await confirmDialog({ title: 'Transfer ownership', message: `Make ${m.email} the owner? You will become an Admin.`, confirmLabel: 'Transfer' })) {
                        await teams.transferOwnership(teamId, m.userId);
                        void reload();
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                  >
                    👑
                  </button>
                )}
                {admin && m.role !== 'OWNER' && (
                  <button
                    title="Remove"
                    onClick={async () => {
                      if (await confirmDialog({ title: 'Remove member', message: `Remove ${m.email} from the team?`, confirmLabel: 'Remove', danger: true })) {
                        await teams.removeMember(teamId, m.userId);
                        void reload();
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
                  >
                    🗑
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
