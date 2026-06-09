'use client';

import { create } from 'zustand';
import type { CollectionNode, RequestDefinition } from '@rocket/types';
import * as api from '@/lib/app-api';
import {
  addNode,
  emptyFolder,
  emptyRequestNode,
  findRequest,
  removeNode,
  renameNode,
  updateRequest,
} from '@/lib/tree';

type Tree = CollectionNode[];

interface AppState {
  workspaceId: string | null;
  workspaceName: string | null;
  collections: api.CollectionSummary[];
  cache: Record<string, api.CollectionFull>; // full collections by id
  expanded: Record<string, boolean>;
  activeCollectionId: string | null;
  activeNodeId: string | null;
  draft: RequestDefinition | null;
  response: api.ProxyResponseDto | null;
  sendError: string | null;
  sending: boolean;

  init: (workspaceId: string, workspaceName: string) => Promise<void>;
  toggleCollection: (id: string) => Promise<void>;
  selectRequest: (collectionId: string, nodeId: string) => void;
  updateDraft: (patch: Partial<RequestDefinition>) => void;
  saveActive: () => Promise<void>;
  send: () => Promise<void>;

  createCollection: (name: string) => Promise<void>;
  addRequest: (collectionId: string, folderId: string | null) => Promise<void>;
  addFolder: (collectionId: string, folderId: string | null) => Promise<void>;
  rename: (collectionId: string, nodeId: string, name: string) => Promise<void>;
  deleteNode: (collectionId: string, nodeId: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useApp = create<AppState>((set, get) => ({
  workspaceId: null,
  workspaceName: null,
  collections: [],
  cache: {},
  expanded: {},
  activeCollectionId: null,
  activeNodeId: null,
  draft: null,
  response: null,
  sendError: null,
  sending: false,

  async init(workspaceId, workspaceName) {
    const detail = await api.getWorkspace(workspaceId);
    set({ workspaceId, workspaceName, collections: detail.collections });
  },

  async toggleCollection(id) {
    const expanded = { ...get().expanded, [id]: !get().expanded[id] };
    set({ expanded });
    if (expanded[id] && !get().cache[id]) {
      const full = await api.getCollection(id);
      set({ cache: { ...get().cache, [id]: full } });
    }
  },

  selectRequest(collectionId, nodeId) {
    const col = get().cache[collectionId];
    if (!col) return;
    const node = findRequest(col.tree as Tree, nodeId);
    if (!node) return;
    set({
      activeCollectionId: collectionId,
      activeNodeId: nodeId,
      draft: structuredClone(node.request),
      response: null,
      sendError: null,
    });
  },

  updateDraft(patch) {
    const draft = get().draft;
    if (!draft) return;
    set({ draft: { ...draft, ...patch } });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void get().saveActive(), 600);
  },

  async saveActive() {
    const { activeCollectionId, activeNodeId, draft, cache } = get();
    if (!activeCollectionId || !activeNodeId || !draft) return;
    const col = cache[activeCollectionId];
    if (!col) return;
    const tree = updateRequest(col.tree as Tree, activeNodeId, draft);
    set({ cache: { ...cache, [activeCollectionId]: { ...col, tree } } });
    await api.updateCollection(activeCollectionId, { tree });
  },

  async send() {
    const { workspaceId, draft } = get();
    if (!workspaceId || !draft) return;
    set({ sending: true, sendError: null, response: null });
    try {
      await get().saveActive();
      const result = await api.sendRequest(workspaceId, draft);
      if (result.ok && result.response) {
        set({ response: result.response });
      } else {
        set({ sendError: result.error?.error ?? 'Request failed' });
      }
    } catch (e) {
      set({ sendError: e instanceof Error ? e.message : 'Request failed' });
    } finally {
      set({ sending: false });
    }
  },

  async createCollection(name) {
    const { workspaceId } = get();
    if (!workspaceId) return;
    const full = await api.createCollection(workspaceId, name);
    set({
      collections: [
        ...get().collections,
        { id: full.id, name: full.name, description: full.description, updatedAt: '' },
      ],
      cache: { ...get().cache, [full.id]: full },
      expanded: { ...get().expanded, [full.id]: true },
    });
  },

  async addRequest(collectionId, folderId) {
    await mutateTree(get, set, collectionId, (tree) =>
      addNode(tree, folderId, emptyRequestNode()),
    );
  },

  async addFolder(collectionId, folderId) {
    await mutateTree(get, set, collectionId, (tree) => addNode(tree, folderId, emptyFolder()));
  },

  async rename(collectionId, nodeId, name) {
    await mutateTree(get, set, collectionId, (tree) => renameNode(tree, nodeId, name));
  },

  async deleteNode(collectionId, nodeId) {
    await mutateTree(get, set, collectionId, (tree) => removeNode(tree, nodeId));
    if (get().activeNodeId === nodeId) set({ activeNodeId: null, draft: null, response: null });
  },

  async deleteCollection(id) {
    await api.deleteCollection(id);
    const { [id]: _removed, ...cache } = get().cache;
    set({
      collections: get().collections.filter((c) => c.id !== id),
      cache,
      activeCollectionId: get().activeCollectionId === id ? null : get().activeCollectionId,
      draft: get().activeCollectionId === id ? null : get().draft,
    });
  },
}));

/** Apply an immutable tree transform, update the cache, and persist. */
async function mutateTree(
  get: () => AppState,
  set: (partial: Partial<AppState>) => void,
  collectionId: string,
  transform: (tree: Tree) => Tree,
) {
  const col = get().cache[collectionId];
  if (!col) return;
  const tree = transform(col.tree as Tree);
  set({ cache: { ...get().cache, [collectionId]: { ...col, tree } } });
  await api.updateCollection(collectionId, { tree });
}
