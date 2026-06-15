'use client';

import { useEffect, useState } from 'react';
import type { CollectionNode } from '@rocket/types';
import { useApp } from '@/store/appStore';
import { flattenFolders } from '@/lib/tree';
import { Modal } from './Modal';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

const NEW_COLLECTION = '__new__';

/**
 * "Save request" dialog: name the request and choose a collection (and optional
 * folder) to store it in. Works for any request kind — HTTP, GraphQL, WebSocket,
 * Socket.IO — so every new request can be persisted the same standard way.
 */
export function SaveRequestModal({ onClose }: { onClose: () => void }) {
  const { draft, collections, cache, createCollection, saveDraftToCollection, loadCollection } = useApp();
  const [name, setName] = useState(draft?.name || 'New Request');
  const [collectionId, setCollectionId] = useState<string>(collections[0]?.id ?? NEW_COLLECTION);
  const [newCollectionName, setNewCollectionName] = useState('My Collection');
  const [folderId, setFolderId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  // Ensure the chosen collection's tree is loaded so we can list its folders.
  useEffect(() => {
    if (collectionId && collectionId !== NEW_COLLECTION && !cache[collectionId]) {
      void loadCollection(collectionId);
    }
  }, [collectionId, cache, loadCollection]);

  const folders =
    collectionId !== NEW_COLLECTION && cache[collectionId]
      ? flattenFolders(cache[collectionId]!.tree as CollectionNode[])
      : [];

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      let targetId = collectionId;
      if (collectionId === NEW_COLLECTION) {
        targetId = await createCollection(newCollectionName.trim() || 'My Collection');
        if (!targetId) return;
      }
      await saveDraftToCollection(targetId, folderId || null, name);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Save request" onClose={onClose} width={460}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Label htmlFor="save-name">Request name</Label>
        <Input id="save-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />

        <Label htmlFor="save-collection">Collection</Label>
        <select
          id="save-collection"
          value={collectionId}
          onChange={(e) => (setCollectionId(e.target.value), setFolderId(''))}
          style={selectStyle}
        >
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value={NEW_COLLECTION}>➕ New collection…</option>
        </select>

        {collectionId === NEW_COLLECTION ? (
          <Input
            placeholder="New collection name"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
          />
        ) : (
          folders.length > 0 && (
            <>
              <Label htmlFor="save-folder">Folder</Label>
              <select
                id="save-folder"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                style={selectStyle}
              >
                <option value="">(collection root)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {' '.repeat(f.depth * 2)}
                    {f.name}
                  </option>
                ))}
              </select>
            </>
          )
        )}

        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

const selectStyle: React.CSSProperties = {
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  padding: '0.5rem 0.6rem',
  fontSize: '0.9rem',
};
