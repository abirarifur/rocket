'use client';

import { create } from 'zustand';
import type { CollectionNode, RequestDefinition, Variable } from '@rocket/types';
import * as api from '@/lib/app-api';
import * as envApi from '@/lib/env-api';
import { canEdit, type Role } from '@/lib/teams-api';
import * as teamsApi from '@/lib/teams-api';
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
  workspaces: api.WorkspaceSummary[];
  teamId: string | null;
  role: Role | null;
  collections: api.CollectionSummary[];
  cache: Record<string, api.CollectionFull>; // full collections by id
  expanded: Record<string, boolean>;
  activeCollectionId: string | null;
  activeNodeId: string | null;
  draft: RequestDefinition | null;
  response: api.ProxyResponseDto | null;
  sendError: string | null;
  sending: boolean;

  // Environments
  environments: envApi.Environment[];
  activeEnvironmentId: string | null;

  init: (workspaceId?: string) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  loadCollection: (id: string) => Promise<void>;
  setActiveEnvironment: (id: string | null) => void;
  createEnvironment: (name: string) => Promise<void>;
  updateEnvironment: (id: string, patch: { name?: string; variables?: Variable[] }) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
  setCollectionVariables: (collectionId: string, variables: Variable[]) => Promise<void>;
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
  forkCollection: (collectionId: string, name?: string) => Promise<void>;
  createTeamWorkspace: (name: string) => Promise<void>;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useApp = create<AppState>((set, get) => ({
  workspaceId: null,
  workspaceName: null,
  workspaces: [],
  teamId: null,
  role: null,
  collections: [],
  cache: {},
  expanded: {},
  activeCollectionId: null,
  activeNodeId: null,
  draft: null,
  response: null,
  sendError: null,
  sending: false,
  environments: [],
  activeEnvironmentId: null,

  async init(workspaceId) {
    const workspaces = await api.listWorkspaces();
    set({ workspaces });
    const target = workspaceId
      ? workspaces.find((w) => w.id === workspaceId)
      : workspaces[0];
    if (target) await get().switchWorkspace(target.id);
  },

  async switchWorkspace(workspaceId) {
    const summary = get().workspaces.find((w) => w.id === workspaceId);
    const [detail, environments] = await Promise.all([
      api.getWorkspace(workspaceId),
      envApi.listEnvironments(workspaceId),
    ]);
    set({
      workspaceId,
      workspaceName: summary?.name ?? detail.name,
      teamId: summary?.teamId ?? null,
      role: (summary?.role as Role) ?? null,
      collections: detail.collections,
      environments,
      // reset per-workspace UI state
      cache: {},
      expanded: {},
      activeCollectionId: null,
      activeNodeId: null,
      draft: null,
      response: null,
      activeEnvironmentId: null,
    });
  },

  async loadCollection(id) {
    if (get().cache[id]) return;
    const full = await api.getCollection(id);
    set({ cache: { ...get().cache, [id]: full } });
  },

  setActiveEnvironment(id) {
    set({ activeEnvironmentId: id });
  },

  async createEnvironment(name) {
    const { workspaceId } = get();
    if (!workspaceId) return;
    const env = await envApi.createEnvironment(workspaceId, name);
    set({ environments: [...get().environments, env], activeEnvironmentId: env.id });
  },

  async updateEnvironment(id, patch) {
    const env = await envApi.updateEnvironment(id, patch);
    set({ environments: get().environments.map((e) => (e.id === id ? env : e)) });
  },

  async deleteEnvironment(id) {
    await envApi.deleteEnvironment(id);
    set({
      environments: get().environments.filter((e) => e.id !== id),
      activeEnvironmentId: get().activeEnvironmentId === id ? null : get().activeEnvironmentId,
    });
  },

  async setCollectionVariables(collectionId, variables) {
    const col = get().cache[collectionId];
    if (!col) return;
    set({ cache: { ...get().cache, [collectionId]: { ...col, variables } } });
    await api.updateCollectionVariables(collectionId, variables);
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
    const { activeCollectionId, activeNodeId, draft, cache, role } = get();
    if (!activeCollectionId || !activeNodeId || !draft) return;
    if (!canEdit(role)) return; // viewers can send but not persist edits
    const col = cache[activeCollectionId];
    if (!col) return;
    const tree = updateRequest(col.tree as Tree, activeNodeId, draft);
    set({ cache: { ...cache, [activeCollectionId]: { ...col, tree } } });
    await api.updateCollection(activeCollectionId, { tree });
  },

  async send() {
    const { workspaceId, draft, activeEnvironmentId, activeCollectionId } = get();
    if (!workspaceId || !draft) return;
    set({ sending: true, sendError: null, response: null });
    try {
      await get().saveActive();
      const result = await api.sendRequest(workspaceId, draft, {
        environmentId: activeEnvironmentId,
        collectionId: activeCollectionId,
      });
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

  async forkCollection(collectionId, name) {
    const { workspaceId } = get();
    if (!workspaceId) return;
    const fork = await teamsApi.forkCollection(collectionId, workspaceId, name);
    set({
      collections: [
        ...get().collections,
        { id: fork.id, name: fork.name, description: null, updatedAt: '' },
      ],
    });
  },

  async createTeamWorkspace(name) {
    const { teamId } = get();
    if (!teamId) return;
    const ws = await teamsApi.createWorkspace(teamId, name, 'TEAM');
    await get().init(); // refresh workspace list
    await get().switchWorkspace(ws.id);
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
