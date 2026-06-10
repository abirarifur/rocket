'use client';

import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/appStore';
import { getSocket } from '@/lib/socket';
import * as commentsApi from '@/lib/comments-api';
import type { Comment } from '@/lib/comments-api';
import { Modal } from './Modal';

export function CommentsModal({
  collectionId,
  collectionName,
  onClose,
}: {
  collectionId: string;
  collectionName: string;
  onClose: () => void;
}) {
  const { meId } = useApp();
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    commentsApi.listComments(collectionId).then(setComments).catch(() => undefined);
    const socket = getSocket();
    const onCreated = (e: { collectionId: string; comment: Comment }) => {
      if (e.collectionId === collectionId) {
        setComments((prev) => (prev.some((c) => c.id === e.comment.id) ? prev : [...prev, e.comment]));
      }
    };
    socket.on('comment:created', onCreated);
    return () => void socket.off('comment:created', onCreated);
  }, [collectionId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setBody('');
    const created = await commentsApi.addComment(collectionId, text);
    setComments((prev) => (prev.some((c) => c.id === created.id) ? prev : [...prev, created]));
  }

  return (
    <Modal title={`Comments · ${collectionName}`} onClose={onClose} width={520}>
      <div style={{ maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {comments.length === 0 && <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No comments yet.</p>}
        {comments.map((c) => (
          <div key={c.id} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
              <strong style={{ color: c.author.id === meId ? 'var(--accent)' : 'var(--text)' }}>
                {c.author.name ?? c.author.email}
              </strong>{' '}
              · {new Date(c.createdAt).toLocaleTimeString()}
            </div>
            <div style={{ fontSize: '0.9rem' }}>{c.body}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
        <input
          style={{
            flex: 1,
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text)',
            padding: '0.5rem 0.6rem',
            fontSize: '0.9rem',
          }}
          placeholder="Write a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button
          onClick={send}
          disabled={!body.trim()}
          style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '0 1rem', fontWeight: 600 }}
        >
          Send
        </button>
      </div>
    </Modal>
  );
}
