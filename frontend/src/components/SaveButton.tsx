'use client';

import { useEffect, useState } from 'react';
import { Check, Save } from 'lucide-react';
import { useApp } from '@/store/appStore';
import { canEdit } from '@/lib/teams-api';
import { SaveRequestModal } from './SaveRequestModal';

/**
 * Standard Save control for any request editor (HTTP/GraphQL/WebSocket/Socket.IO).
 * Unsaved drafts open the "Save to collection" dialog; already-saved requests
 * flush their pending edits. Ctrl/⌘+S triggers the same behaviour app-wide.
 */
export function SaveButton({ style }: { style?: React.CSSProperties }) {
  const activeNodeId = useApp((s) => s.activeNodeId);
  const saveActive = useApp((s) => s.saveActive);
  const role = useApp((s) => s.role);
  const [flash, setFlash] = useState(false);
  const editable = canEdit(role);

  async function onClick() {
    if (!editable) return;
    if (activeNodeId) {
      await saveActive();
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    } else {
      window.dispatchEvent(new Event('rocket:open-save'));
    }
  }

  return (
    <button
      onClick={onClick}
      disabled={!editable}
      title={activeNodeId ? 'Save (Ctrl/⌘+S)' : 'Save to a collection (Ctrl/⌘+S)'}
      className="inline-flex items-center gap-1.5"
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        borderRadius: 6,
        color: 'var(--text)',
        cursor: editable ? 'pointer' : 'not-allowed',
        opacity: editable ? 1 : 0.5,
        padding: '0 0.8rem',
        fontSize: '0.85rem',
        ...style,
      }}
    >
      {flash ? <Check size={15} /> : <Save size={15} />}
      {flash ? 'Saved' : 'Save'}
    </button>
  );
}

/** Mounted once at the app root; opens the Save dialog on the global event / Ctrl+S. */
export function SaveDialogHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('rocket:open-save', onOpen);
    return () => window.removeEventListener('rocket:open-save', onOpen);
  }, []);
  if (!open) return null;
  return <SaveRequestModal onClose={() => setOpen(false)} />;
}
