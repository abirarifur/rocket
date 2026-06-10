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
  emptyRequest,
  emptyRequestNode,
  findRequest,
  moveBefore,
  newId,
  removeNode,
  renameNode,
  updateRequest,
} from '@/lib/tree';
import * as interopApi from '@/lib/interop-api';
import { getSocket, type PresenceEntry } from '@/lib/socket';
import * as cookieJar from '@/lib/cookie-jar';

type Tree = CollectionNode[];

export interface Tab {
  id: string;
  kind: 'request' | 'environment';
  collectionId: string | null;
  nodeId: string | null;
  label: string;
  method: string;
}

interface TabSnapshot {
  draft: RequestDefinition | null;
  response: api.ProxyResponseDto | null;
  testResults: api.ScriptTest[];
  scriptLogs: string[];
  scriptError: string | null;
  sendError: string | null;
}

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
  testResults: api.ScriptTest[];
  scriptLogs: string[];
  scriptError: string | null;

  // Open request tabs (each preserves its own draft/response state)
  tabs: Tab[];
  activeTabId: string | null;
  tabStash: Record<string, TabSnapshot>;
  setActiveTab: (id: string) => void;
  closeTab: (id: string) => void;
  newTab: () => void;
  openEnvironmentTab: () => void;

  // Environments
  environments: envApi.Environment[];
  activeEnvironmentId: string | null;
  globals: Variable[]; // team-wide variables (lowest precedence)
  refreshGlobals: () => Promise<void>;

  // Realtime collaboration
  meId: string | null;
  presence: PresenceEntry[];

  setMe: (id: string) => void;
  connectRealtime: () => void;
  init: (workspaceId?: string) => Promise<void>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  loadCollection: (id: string) => Promise<void>;
  setActiveEnvironment: (id: string | null) => void;
  refreshEnvironments: () => Promise<void>;
  createEnvironment: (name: string) => Promise<void>;
  updateEnvironment: (id: string, patch: { name?: string; variables?: Variable[] }) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
  setCollectionVariables: (collectionId: string, variables: Variable[]) => Promise<void>;
  toggleCollection: (id: string) => Promise<void>;
  selectRequest: (collectionId: string, nodeId: string) => void;
  loadDraft: (request: RequestDefinition) => void;
  updateDraft: (patch: Partial<RequestDefinition>) => void;
  saveActive: () => Promise<void>;
  send: () => Promise<void>;

  createCollection: (name: string) => Promise<void>;
  addRequest: (collectionId: string, folderId: string | null) => Promise<void>;
  addFolder: (collectionId: string, folderId: string | null) => Promise<void>;
  rename: (collectionId: string, nodeId: string, name: string) => Promise<void>;
  moveNode: (collectionId: string, dragId: string, targetId: string) => Promise<void>;
  deleteNode: (collectionId: string, nodeId: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  forkCollection: (collectionId: string, name?: string) => Promise<void>;
  createTeamWorkspace: (name: string) => Promise<void>;
  importDocument: (type: interopApi.ImportType, content: string) => Promise<void>;
  importCurlInto: (collectionId: string, request: RequestDefinition) => Promise<void>;
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
  testResults: [],
  scriptLogs: [],
  scriptError: null,
  tabs: [],
  activeTabId: null,
  tabStash: {},
  environments: [],
  activeEnvironmentId: null,
  globals: [],
  meId: null,
  presence: [],

  setMe(id) {
    set({ meId: id });
  },

  /** Connect the realtime socket and register presence + live-update handlers. */
  connectRealtime() {
    const socket = getSocket();
    socket.off('presence');
    socket.off('collection:updated');
    socket.on('presence', (list: PresenceEntry[]) => set({ presence: list }));
    socket.on('collection:updated', async (e: { collectionId: string; byUserId: string }) => {
      // Ignore our own edits; refetch others' changes into the cache (live sidebar).
      if (e.byUserId === get().meId) return;
      if (!get().cache[e.collectionId]) return;
      const full = await api.getCollection(e.collectionId);
      set({ cache: { ...get().cache, [e.collectionId]: full } });
    });
    const ws = get().workspaceId;
    if (ws) socket.emit('join', { workspaceId: ws });
  },

  async init(workspaceId) {
    const workspaces = await api.listWorkspaces();
    set({ workspaces });
    const target = workspaceId
      ? workspaces.find((w) => w.id === workspaceId)
      : workspaces[0];
    if (target) await get().switchWorkspace(target.id);
  },

  async switchWorkspace(workspaceId) {
    const prev = get().workspaceId;
    const summary = get().workspaces.find((w) => w.id === workspaceId);
    const socket = getSocket();
    if (prev && prev !== workspaceId) socket.emit('leave', { workspaceId: prev });
    socket.emit('join', { workspaceId });
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
      tabs: [],
      activeTabId: null,
      tabStash: {},
      activeEnvironmentId: null,
      globals: [],
      presence: [],
    });
    // Load team-wide globals so {{var}} resolution previews are accurate.
    const teamId = summary?.teamId ?? null;
    if (teamId) {
      teamsApi
        .getGlobals(teamId)
        .then((g) => set({ globals: g as Variable[] }))
        .catch(() => undefined);
    }
  },

  async refreshGlobals() {
    const { teamId } = get();
    if (!teamId) return;
    try {
      set({ globals: (await teamsApi.getGlobals(teamId)) as Variable[] });
    } catch {
      /* ignore */
    }
  },

  async loadCollection(id) {
    if (get().cache[id]) return;
    const full = await api.getCollection(id);
    set({ cache: { ...get().cache, [id]: full } });
  },

  setActiveEnvironment(id) {
    set({ activeEnvironmentId: id });
  },

  async refreshEnvironments() {
    const { workspaceId } = get();
    if (!workspaceId) return;
    set({ environments: await envApi.listEnvironments(workspaceId) });
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
    // Focus an existing tab for this request, or open a new one.
    const existing = get().tabs.find((t) => t.collectionId === collectionId && t.nodeId === nodeId);
    if (existing) {
      get().setActiveTab(existing.id);
      return;
    }
    stashActive(get, set);
    const tab: Tab = { id: newId('tab'), kind: 'request', collectionId, nodeId, label: node.request.name, method: node.request.method };
    set({
      tabs: [...get().tabs, tab],
      activeTabId: tab.id,
      activeCollectionId: collectionId,
      activeNodeId: nodeId,
      draft: structuredClone(node.request),
      response: null,
      sendError: null,
      testResults: [],
      scriptLogs: [],
      scriptError: null,
    });
    const ws = get().workspaceId;
    if (ws) getSocket().emit('view', { workspaceId: ws, collectionId });
  },

  /** Load a request into a new tab as an ephemeral draft (e.g. from history). */
  loadDraft(request) {
    stashActive(get, set);
    const tab: Tab = { id: newId('tab'), kind: 'request', collectionId: null, nodeId: null, label: request.name || 'Untitled', method: request.method };
    set({
      tabs: [...get().tabs, tab],
      activeTabId: tab.id,
      activeCollectionId: null,
      activeNodeId: null,
      draft: structuredClone(request),
      response: null,
      sendError: null,
      testResults: [],
      scriptLogs: [],
      scriptError: null,
    });
  },

  newTab() {
    stashActive(get, set);
    const tab: Tab = { id: newId('tab'), kind: 'request', collectionId: null, nodeId: null, label: 'Untitled', method: 'GET' };
    set({
      tabs: [...get().tabs, tab],
      activeTabId: tab.id,
      activeCollectionId: null,
      activeNodeId: null,
      draft: emptyRequest(),
      response: null,
      sendError: null,
      testResults: [],
      scriptLogs: [],
      scriptError: null,
    });
  },

  /** Open (or focus) the Environments editor tab — a full panel, not a modal. */
  openEnvironmentTab() {
    const existing = get().tabs.find((t) => t.kind === 'environment');
    if (existing) {
      get().setActiveTab(existing.id);
      return;
    }
    stashActive(get, set);
    const tab: Tab = { id: newId('tab'), kind: 'environment', collectionId: null, nodeId: null, label: 'Environments', method: '' };
    set({
      tabs: [...get().tabs, tab],
      activeTabId: tab.id,
      activeCollectionId: null,
      activeNodeId: null,
      ...restoreSnapshot(undefined),
    });
  },

  setActiveTab(id) {
    if (id === get().activeTabId) return;
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab) return;
    stashActive(get, set);
    set({ activeTabId: id, activeCollectionId: tab.collectionId, activeNodeId: tab.nodeId, ...restoreSnapshot(get().tabStash[id]) });
    const ws = get().workspaceId;
    if (tab.collectionId && ws) getSocket().emit('view', { workspaceId: ws, collectionId: tab.collectionId });
  },

  closeTab(id) {
    const idx = get().tabs.findIndex((t) => t.id === id);
    const tabs = get().tabs.filter((t) => t.id !== id);
    const { [id]: _removed, ...tabStash } = get().tabStash;
    if (get().activeTabId !== id) {
      set({ tabs, tabStash });
      return;
    }
    const next = tabs[idx] ?? tabs[idx - 1] ?? null;
    if (next) {
      set({ tabs, tabStash, activeTabId: next.id, activeCollectionId: next.collectionId, activeNodeId: next.nodeId, ...restoreSnapshot(tabStash[next.id]) });
    } else {
      set({ tabs, tabStash, activeTabId: null, activeCollectionId: null, activeNodeId: null, ...restoreSnapshot(undefined) });
    }
  },

  updateDraft(patch) {
    const draft = get().draft;
    if (!draft) return;
    const next = { ...draft, ...patch };
    const tabs = get().tabs.map((t) =>
      t.id === get().activeTabId ? { ...t, label: next.name || 'Untitled', method: next.method } : t,
    );
    set({ draft: next, tabs });
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
    set({ sending: true, sendError: null, response: null, testResults: [], scriptLogs: [], scriptError: null });
    try {
      await get().saveActive();
      // Attach matching cookies from the jar (without persisting them to the request).
      const cookieHeader = cookieJar.cookieHeaderFor(workspaceId, draft.url);
      const hasCookie = draft.headers.some((h) => h.enabled && h.key.toLowerCase() === 'cookie');
      const toSend =
        cookieHeader && !hasCookie
          ? { ...draft, headers: [...draft.headers, { key: 'Cookie', value: cookieHeader, enabled: true }] }
          : draft;
      const result = await api.sendRequest(workspaceId, toSend, {
        environmentId: activeEnvironmentId,
        collectionId: activeCollectionId,
      });
      set({
        testResults: result.tests ?? [],
        scriptLogs: result.logs ?? [],
        scriptError: result.scriptError ?? null,
      });
      if (result.ok && result.response) {
        if (result.response.setCookies?.length) {
          cookieJar.storeFromResponse(workspaceId, draft.url, result.response.setCookies);
        }
        set({ response: result.response });
        // A test script may have written to the active environment — refresh it.
        if (activeEnvironmentId && result.tests && result.tests.length >= 0) {
          void get().refreshEnvironments();
        }
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

  async moveNode(collectionId, dragId, targetId) {
    await mutateTree(get, set, collectionId, (tree) => moveBefore(tree as Tree, dragId, targetId));
  },

  async deleteNode(collectionId, nodeId) {
    await mutateTree(get, set, collectionId, (tree) => removeNode(tree, nodeId));
    // Close any open tab for the deleted request.
    const tab = get().tabs.find((t) => t.collectionId === collectionId && t.nodeId === nodeId);
    if (tab) get().closeTab(tab.id);
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

  async importDocument(type, content) {
    const { workspaceId } = get();
    if (!workspaceId) return;
    const created = await interopApi.importCollection(workspaceId, type, content);
    const full = await api.getCollection(created.id);
    set({
      collections: [
        ...get().collections,
        { id: full.id, name: full.name, description: full.description, updatedAt: '' },
      ],
      cache: { ...get().cache, [full.id]: full },
      expanded: { ...get().expanded, [full.id]: true },
    });
  },

  async importCurlInto(collectionId, request) {
    await get().loadCollection(collectionId);
    const col = get().cache[collectionId];
    if (!col) return;
    const node = { id: newId('req'), type: 'request' as const, order: 0, request };
    const tree = [...(col.tree as Tree), node];
    set({
      cache: { ...get().cache, [collectionId]: { ...col, tree } },
      expanded: { ...get().expanded, [collectionId]: true },
    });
    await api.updateCollection(collectionId, { tree });
    get().selectRequest(collectionId, node.id);
  },
}));

/** Save the active tab's live state into the stash before switching away. */
function stashActive(get: () => AppState, set: (p: Partial<AppState>) => void) {
  const s = get();
  if (!s.activeTabId) return;
  set({
    tabStash: {
      ...s.tabStash,
      [s.activeTabId]: {
        draft: s.draft,
        response: s.response,
        testResults: s.testResults,
        scriptLogs: s.scriptLogs,
        scriptError: s.scriptError,
        sendError: s.sendError,
      },
    },
  });
}

/** Top-level fields to apply when activating a tab (from its snapshot). */
function restoreSnapshot(snap: TabSnapshot | undefined) {
  return {
    draft: snap?.draft ?? null,
    response: snap?.response ?? null,
    testResults: snap?.testResults ?? [],
    scriptLogs: snap?.scriptLogs ?? [],
    scriptError: snap?.scriptError ?? null,
    sendError: snap?.sendError ?? null,
  };
}

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
