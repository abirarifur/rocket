'use client';

import { useState } from 'react';
import type { CollectionNode, Variable } from '@rocket/types';
import { useApp } from '@/store/appStore';
import { Modal } from './Modal';
import { VariablesEditor } from './VariablesEditor';

const METHOD_COLOR: Record<string, string> = {
  GET: '#3fb950',
  POST: '#d29922',
  PUT: '#58a6ff',
  PATCH: '#a371f7',
  DELETE: '#f85149',
  HEAD: '#8a93a6',
  OPTIONS: '#8a93a6',
};

function TreeNodes({ nodes, collectionId }: { nodes: CollectionNode[]; collectionId: string }) {
  const { activeNodeId, selectRequest, addRequest, addFolder, rename, deleteNode } = useApp();

  return (
    <ul style={{ listStyle: 'none', margin: 0, paddingLeft: '0.85rem' }}>
      {nodes.map((node) => {
        if (node.type === 'request') {
          const active = node.id === activeNodeId;
          return (
            <li key={node.id}>
              <div
                onClick={() => selectRequest(collectionId, node.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.25rem 0.4rem',
                  borderRadius: 6,
                  cursor: 'pointer',
                  background: active ? 'rgba(255,107,53,0.12)' : 'transparent',
                }}
                className="tree-row"
              >
                <span
                  style={{
                    color: METHOD_COLOR[node.request.method] ?? 'var(--muted)',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    width: 38,
                  }}
                >
                  {node.request.method}
                </span>
                <span style={{ flex: 1, fontSize: '0.85rem' }}>{node.request.name}</span>
                <RowMenu
                  onRename={() => {
                    const name = window.prompt('Rename request', node.request.name);
                    if (name) void rename(collectionId, node.id, name);
                  }}
                  onDelete={() => void deleteNode(collectionId, node.id)}
                />
              </div>
            </li>
          );
        }
        return (
          <li key={node.id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.25rem 0.4rem',
                fontSize: '0.85rem',
              }}
            >
              <span>📁</span>
              <span style={{ flex: 1 }}>{node.name}</span>
              <button
                title="Add request"
                onClick={() => void addRequest(collectionId, node.id)}
                style={miniBtn}
              >
                +
              </button>
              <RowMenu
                onRename={() => {
                  const name = window.prompt('Rename folder', node.name);
                  if (name) void rename(collectionId, node.id, name);
                }}
                onDelete={() => void deleteNode(collectionId, node.id)}
              />
            </div>
            <TreeNodes nodes={node.children} collectionId={collectionId} />
          </li>
        );
      })}
    </ul>
  );
}

function RowMenu({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
  return (
    <span style={{ display: 'flex', gap: 2 }}>
      <button title="Rename" onClick={(e) => (e.stopPropagation(), onRename())} style={miniBtn}>
        ✎
      </button>
      <button title="Delete" onClick={(e) => (e.stopPropagation(), onDelete())} style={miniBtn}>
        🗑
      </button>
    </span>
  );
}

const miniBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: 'var(--muted)',
  cursor: 'pointer',
  fontSize: '0.75rem',
  padding: '0 2px',
};

export function Sidebar() {
  const {
    collections,
    expanded,
    cache,
    toggleCollection,
    createCollection,
    addRequest,
    addFolder,
    deleteCollection,
  } = useApp();
  const [varsFor, setVarsFor] = useState<string | null>(null);

  return (
    <aside
      style={{
        width: 300,
        borderRight: '1px solid var(--border)',
        height: '100%',
        overflowY: 'auto',
        background: 'var(--panel)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0.85rem 1rem',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <strong style={{ fontSize: '0.8rem', letterSpacing: 0.4, color: 'var(--muted)' }}>
          COLLECTIONS
        </strong>
        <button
          onClick={() => {
            const name = window.prompt('New collection name', 'My Collection');
            if (name) void createCollection(name);
          }}
          style={{ ...miniBtn, color: 'var(--accent)', fontSize: '1.1rem' }}
          title="New collection"
        >
          +
        </button>
      </div>

      {collections.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', padding: '1rem' }}>
          No collections yet. Click + to create one.
        </p>
      )}

      {collections.map((c) => (
        <div key={c.id} style={{ padding: '0.25rem 0.5rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.4rem',
              cursor: 'pointer',
            }}
            onClick={() => void toggleCollection(c.id)}
          >
            <span style={{ color: 'var(--muted)' }}>{expanded[c.id] ? '▾' : '▸'}</span>
            <strong style={{ flex: 1, fontSize: '0.88rem' }}>{c.name}</strong>
            <button
              title="Add request"
              onClick={(e) => (e.stopPropagation(), addRequest(c.id, null))}
              style={miniBtn}
            >
              +req
            </button>
            <button
              title="Add folder"
              onClick={(e) => (e.stopPropagation(), addFolder(c.id, null))}
              style={miniBtn}
            >
              +dir
            </button>
            <button
              title="Collection variables"
              onClick={async (e) => {
                e.stopPropagation();
                await useApp.getState().loadCollection(c.id);
                setVarsFor(c.id);
              }}
              style={miniBtn}
            >
              {'{}'}
            </button>
            <button
              title="Delete collection"
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete collection "${c.name}"?`)) void deleteCollection(c.id);
              }}
              style={miniBtn}
            >
              🗑
            </button>
          </div>
          {expanded[c.id] && cache[c.id] && (
            <TreeNodes nodes={cache[c.id]!.tree as CollectionNode[]} collectionId={c.id} />
          )}
        </div>
      ))}

      {varsFor && cache[varsFor] && (
        <CollectionVarsModal collectionId={varsFor} onClose={() => setVarsFor(null)} />
      )}
    </aside>
  );
}

function CollectionVarsModal({
  collectionId,
  onClose,
}: {
  collectionId: string;
  onClose: () => void;
}) {
  const { cache, setCollectionVariables } = useApp();
  const col = cache[collectionId]!;
  const [rows, setRows] = useState<Variable[]>((col.variables as Variable[]) ?? []);
  const [saved, setSaved] = useState(false);

  return (
    <Modal title={`Variables · ${col.name}`} onClose={onClose}>
      <VariablesEditor rows={rows} onChange={(v) => (setRows(v), setSaved(false))} />
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
        <button
          onClick={async () => {
            await setCollectionVariables(collectionId, rows);
            setSaved(true);
          }}
          style={{ background: 'var(--accent)', border: 'none', borderRadius: 6, color: '#fff', cursor: 'pointer', padding: '0.45rem 1rem', fontWeight: 600 }}
        >
          Save
        </button>
        {saved && <span style={{ color: 'var(--ok)', fontSize: '0.82rem' }}>Saved ✓</span>}
        <span style={{ color: 'var(--muted)', fontSize: '0.75rem', marginLeft: 'auto' }}>
          Collection scope · overridden by the active environment
        </span>
      </div>
    </Modal>
  );
}
