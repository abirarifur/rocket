'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, ChevronDown, ChevronRight, Download, Folder, MoreHorizontal, Plus } from 'lucide-react';
import type { CollectionNode } from '@rocket/types';
import { useApp } from '@/store/appStore';
import { canEdit } from '@/lib/teams-api';
import { filterTree } from '@/lib/tree';
import { RunModal } from './RunModal';
import { ImportModal } from './ImportModal';
import { OpsModal } from './OpsModal';
import { CommentsModal } from './CommentsModal';
import { ContextMenu, type MenuItem } from './ContextMenu';
import { promptDialog, confirmDialog } from './dialogs';
import { exportCollection } from '@/lib/interop-api';

async function downloadExport(collectionId: string, name: string) {
  const doc = await exportCollection(collectionId);
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/[^\w.-]+/g, '_')}.postman_collection.json`;
  a.click();
  URL.revokeObjectURL(url);
}

const METHOD_COLOR: Record<string, string> = {
  GET: '#3fb950',
  POST: '#d29922',
  PUT: '#58a6ff',
  PATCH: '#a371f7',
  DELETE: '#f85149',
  HEAD: '#8a93a6',
  OPTIONS: '#8a93a6',
};

type OpenMenu = (e: React.MouseEvent, items: MenuItem[]) => void;

function Kebab({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      title="More"
      className="kebab inline-flex items-center"
      onClick={(e) => (e.stopPropagation(), onClick(e))}
      style={miniBtn}
    >
      <MoreHorizontal size={15} />
    </button>
  );
}

function TreeNodes({
  nodes,
  collectionId,
  openMenu,
}: {
  nodes: CollectionNode[];
  collectionId: string;
  openMenu: OpenMenu;
}) {
  const { activeNodeId, role, selectRequest, addRequest, rename, deleteNode, moveNode } = useApp();
  const editable = canEdit(role);

  const requestItems = (node: Extract<CollectionNode, { type: 'request' }>): MenuItem[] => [
    { label: 'Rename', shortcut: 'Ctrl+E', onClick: async () => { const n = await promptDialog({ title: 'Rename request', label: 'Name', defaultValue: node.request.name, confirmLabel: 'Rename' }); if (n) void rename(collectionId, node.id, n); } },
    { divider: true },
    { label: 'Delete', danger: true, shortcut: 'Del', onClick: () => void deleteNode(collectionId, node.id) },
  ];
  const folderItems = (node: Extract<CollectionNode, { type: 'folder' }>): MenuItem[] => [
    { label: 'Add request', onClick: () => void addRequest(collectionId, node.id) },
    { label: 'Rename', onClick: async () => { const n = await promptDialog({ title: 'Rename folder', label: 'Name', defaultValue: node.name, confirmLabel: 'Rename' }); if (n) void rename(collectionId, node.id, n); } },
    { divider: true },
    { label: 'Delete', danger: true, onClick: () => void deleteNode(collectionId, node.id) },
  ];

  // Native HTML5 drag-and-drop reordering (editors only).
  const dragProps = (nodeId: string) =>
    editable
      ? {
          draggable: true,
          onDragStart: (e: React.DragEvent) => {
            e.stopPropagation();
            e.dataTransfer.setData('text/plain', nodeId);
            e.dataTransfer.effectAllowed = 'move';
          },
          onDragOver: (e: React.DragEvent) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          },
          onDrop: (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const dragId = e.dataTransfer.getData('text/plain');
            if (dragId && dragId !== nodeId) void moveNode(collectionId, dragId, nodeId);
          },
        }
      : {};

  return (
    <ul style={{ listStyle: 'none', margin: 0, paddingLeft: '0.85rem' }}>
      {nodes.map((node) => {
        if (node.type === 'request') {
          const active = node.id === activeNodeId;
          return (
            <li key={node.id}>
              <div
                onClick={() => selectRequest(collectionId, node.id)}
                onContextMenu={(e) => editable && openMenu(e, requestItems(node))}
                {...dragProps(node.id)}
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
                {editable && <Kebab onClick={(e) => openMenu(e, requestItems(node))} />}
              </div>
            </li>
          );
        }
        return (
          <li key={node.id}>
            <div
              onContextMenu={(e) => editable && openMenu(e, folderItems(node))}
              {...dragProps(node.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.25rem 0.4rem',
                fontSize: '0.85rem',
              }}
              className="tree-row"
            >
              <Folder size={15} className="text-muted-foreground" />
              <span style={{ flex: 1 }}>{node.name}</span>
              {editable && (
                <>
                  <button title="Add request" className="kebab inline-flex items-center" onClick={() => void addRequest(collectionId, node.id)} style={miniBtn}>
                    <Plus size={14} />
                  </button>
                  <Kebab onClick={(e) => openMenu(e, folderItems(node))} />
                </>
              )}
            </div>
            <TreeNodes nodes={node.children} collectionId={collectionId} openMenu={openMenu} />
          </li>
        );
      })}
    </ul>
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
    role,
    toggleCollection,
    createCollection,
    addRequest,
    addFolder,
    deleteCollection,
    forkCollection,
  } = useApp();
  const editable = canEdit(role);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Ctrl/Cmd+K focuses search (dispatched from the app shell).
  useEffect(() => {
    const onFocus = () => searchRef.current?.focus();
    window.addEventListener('rocket:focus-search', onFocus);
    return () => window.removeEventListener('rocket:focus-search', onFocus);
  }, []);

  // When searching, load all collections so their trees can be matched.
  useEffect(() => {
    if (!query.trim()) return;
    for (const c of collections) if (!cache[c.id]) void useApp.getState().loadCollection(c.id);
  }, [query, collections, cache]);

  const searching = query.trim() !== '';
  const [runFor, setRunFor] = useState<{ id: string; name: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [opsFor, setOpsFor] = useState<{ id: string; name: string } | null>(null);
  const [commentsFor, setCommentsFor] = useState<{ id: string; name: string } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);

  const openMenu = (e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({ x: e.clientX, y: e.clientY, items });
  };

  const collectionItems = (c: { id: string; name: string }): MenuItem[] => {
    const items: MenuItem[] = [];
    if (editable) {
      items.push(
        { label: 'Add request', onClick: () => void addRequest(c.id, null) },
        { label: 'Add folder', onClick: () => void addFolder(c.id, null) },
        { divider: true },
      );
    }
    items.push({ label: 'Run collection', onClick: () => setRunFor({ id: c.id, name: c.name }) });
    items.push({ divider: true });
    items.push({ label: 'Comments', onClick: () => setCommentsFor({ id: c.id, name: c.name }) });
    items.push({ label: 'Export (Postman v2.1)', onClick: () => void downloadExport(c.id, c.name) });
    if (editable) {
      items.push(
        { label: 'Settings (variables · auth)', onClick: () => void useApp.getState().openCollectionTab(c.id) },
        { label: 'Mock / Monitor / Docs', onClick: () => setOpsFor({ id: c.id, name: c.name }) },
        { label: 'Fork', shortcut: 'Ctrl+Alt+F', onClick: async () => { const n = await promptDialog({ title: 'Fork collection', label: 'Fork name', defaultValue: `${c.name} (fork)`, confirmLabel: 'Fork' }); if (n) void forkCollection(c.id, n); } },
        { divider: true },
        { label: 'Delete', danger: true, onClick: async () => { if (await confirmDialog({ title: 'Delete collection', message: `Delete collection "${c.name}"? This cannot be undone.`, confirmLabel: 'Delete', danger: true })) void deleteCollection(c.id); } },
      );
    }
    return items;
  };

  return (
    <aside
      style={{
        width: '100%',
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
        {editable && (
          <>
            <button
              onClick={() => setImportOpen(true)}
              style={miniBtn}
              className="inline-flex items-center"
              title="Import (Postman / OpenAPI / HAR / cURL)"
            >
              <Download size={16} />
            </button>
            <button
              onClick={async () => {
                const name = await promptDialog({ title: 'New collection', label: 'Collection name', defaultValue: 'My Collection', placeholder: 'My Collection' });
                if (name) void createCollection(name);
              }}
              style={{ ...miniBtn, color: 'var(--accent)' }}
              className="inline-flex items-center"
              title="New collection"
            >
              <Plus size={18} />
            </button>
          </>
        )}
      </div>

      <div style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search requests…  (Ctrl/⌘K)"
          style={{
            width: '100%',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text)',
            padding: '0.4rem 0.55rem',
            fontSize: '0.82rem',
          }}
        />
      </div>

      {collections.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: '0.82rem', padding: '1rem' }}>
          No collections yet. Click + to create one.
        </p>
      )}

      {collections
        .filter((c) => {
          if (!searching) return true;
          const tree = (cache[c.id]?.tree as CollectionNode[]) ?? [];
          return c.name.toLowerCase().includes(query.toLowerCase()) || filterTree(tree, query).length > 0;
        })
        .map((c) => (
        <div key={c.id} style={{ padding: '0.25rem 0.5rem' }}>
          <div
            className="tree-row"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.3rem 0.4rem',
              borderRadius: 6,
              cursor: 'pointer',
            }}
            onClick={() => void toggleCollection(c.id)}
            onContextMenu={(e) => openMenu(e, collectionItems(c))}
          >
            <span className="text-muted-foreground inline-flex items-center">
              {searching || expanded[c.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
            <Box size={15} className="text-primary" />
            <strong style={{ flex: 1, fontSize: '0.88rem' }}>{c.name}</strong>
            {editable && (
              <button title="Add request" className="kebab inline-flex items-center" onClick={(e) => (e.stopPropagation(), addRequest(c.id, null))} style={miniBtn}>
                <Plus size={14} />
              </button>
            )}
            <Kebab onClick={(e) => openMenu(e, collectionItems(c))} />
          </div>
          {(searching || expanded[c.id]) && cache[c.id] && (
            <TreeNodes
              nodes={
                searching
                  ? filterTree(cache[c.id]!.tree as CollectionNode[], query)
                  : (cache[c.id]!.tree as CollectionNode[])
              }
              collectionId={c.id}
              openMenu={openMenu}
            />
          )}
        </div>
      ))}

      {runFor && (
        <RunModal
          collectionId={runFor.id}
          collectionName={runFor.name}
          onClose={() => setRunFor(null)}
        />
      )}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
      {opsFor && (
        <OpsModal collectionId={opsFor.id} collectionName={opsFor.name} onClose={() => setOpsFor(null)} />
      )}
      {commentsFor && (
        <CommentsModal
          collectionId={commentsFor.id}
          collectionName={commentsFor.name}
          onClose={() => setCommentsFor(null)}
        />
      )}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
    </aside>
  );
}

