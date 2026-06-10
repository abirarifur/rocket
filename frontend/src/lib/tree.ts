import type { CollectionNode, FolderNode, RequestNode, RequestDefinition } from '@rocket/types';

/** Immutable helpers for the folder/request tree stored on a collection. */

export function findRequest(tree: CollectionNode[], nodeId: string): RequestNode | null {
  for (const node of tree) {
    if (node.type === 'request' && node.id === nodeId) return node;
    if (node.type === 'folder') {
      const found = findRequest(node.children, nodeId);
      if (found) return found;
    }
  }
  return null;
}

export function updateRequest(
  tree: CollectionNode[],
  nodeId: string,
  request: RequestDefinition,
): CollectionNode[] {
  return tree.map((node) => {
    if (node.type === 'request' && node.id === nodeId) return { ...node, request };
    if (node.type === 'folder') {
      return { ...node, children: updateRequest(node.children, nodeId, request) };
    }
    return node;
  });
}

export function renameNode(
  tree: CollectionNode[],
  nodeId: string,
  name: string,
): CollectionNode[] {
  return tree.map((node) => {
    if (node.id === nodeId) {
      if (node.type === 'folder') return { ...node, name };
      return { ...node, request: { ...node.request, name } };
    }
    if (node.type === 'folder') return { ...node, children: renameNode(node.children, nodeId, name) };
    return node;
  });
}

export function removeNode(tree: CollectionNode[], nodeId: string): CollectionNode[] {
  return tree
    .filter((node) => node.id !== nodeId)
    .map((node) =>
      node.type === 'folder' ? { ...node, children: removeNode(node.children, nodeId) } : node,
    );
}

/** Append a node to a folder (folderId) or to the collection root (null). */
export function addNode(
  tree: CollectionNode[],
  folderId: string | null,
  node: CollectionNode,
): CollectionNode[] {
  if (folderId === null) return [...tree, node];
  return tree.map((n) => {
    if (n.type === 'folder' && n.id === folderId) {
      return { ...n, children: [...n.children, node] };
    }
    if (n.type === 'folder') return { ...n, children: addNode(n.children, folderId, node) };
    return n;
  });
}

/** Filter the tree to requests matching a query (by name/method/url); keeps
 *  folders that contain a match. Empty query returns the tree unchanged. */
export function filterTree(tree: CollectionNode[], query: string): CollectionNode[] {
  const q = query.trim().toLowerCase();
  if (!q) return tree;
  const walk = (nodes: CollectionNode[]): CollectionNode[] => {
    const out: CollectionNode[] = [];
    for (const n of nodes) {
      if (n.type === 'request') {
        const r = n.request;
        if (`${r.name} ${r.method} ${r.url}`.toLowerCase().includes(q)) out.push(n);
      } else {
        const children = walk(n.children);
        if (children.length || n.name.toLowerCase().includes(q)) out.push({ ...n, children });
      }
    }
    return out;
  };
  return walk(tree);
}

/** Remove a node anywhere in the tree, returning it and the pruned tree. */
export function extractNode(
  tree: CollectionNode[],
  nodeId: string,
): { node: CollectionNode | null; tree: CollectionNode[] } {
  let found: CollectionNode | null = null;
  const prune = (nodes: CollectionNode[]): CollectionNode[] => {
    const out: CollectionNode[] = [];
    for (const n of nodes) {
      if (n.id === nodeId) {
        found = n;
        continue;
      }
      out.push(n.type === 'folder' ? { ...n, children: prune(n.children) } : n);
    }
    return out;
  };
  const pruned = prune(tree);
  return { node: found, tree: pruned };
}

/** Insert a node immediately before the target node (in the target's sibling list). */
export function insertBefore(
  tree: CollectionNode[],
  targetId: string,
  node: CollectionNode,
): CollectionNode[] {
  const out: CollectionNode[] = [];
  let inserted = false;
  for (const n of tree) {
    if (n.id === targetId) {
      out.push(node);
      inserted = true;
    }
    out.push(n.type === 'folder' ? { ...n, children: insertBefore(n.children, targetId, node) } : n);
  }
  return inserted ? renumber(out) : out;
}

/** Reorder so `dragId` sits just before `targetId` anywhere in the tree. */
export function moveBefore(
  tree: CollectionNode[],
  dragId: string,
  targetId: string,
): CollectionNode[] {
  if (dragId === targetId) return tree;
  const { node, tree: without } = extractNode(tree, dragId);
  if (!node) return tree;
  return insertBefore(without, targetId, node);
}

function renumber(nodes: CollectionNode[]): CollectionNode[] {
  return nodes.map((n, i) => ({ ...n, order: i }));
}

let counter = 0;
/** Client-side id for new nodes (server stores them verbatim in the tree JSON). */
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

export function emptyRequest(name = 'Untitled Request'): RequestDefinition {
  return {
    name,
    method: 'GET',
    url: '',
    params: [],
    headers: [],
    body: { mode: 'none' },
    // New requests inherit their collection's auth by default (like Postman).
    auth: { type: 'inherit' },
  };
}

export function emptyRequestNode(name = 'New Request'): RequestNode {
  return { id: newId('req'), type: 'request', order: 0, request: emptyRequest(name) };
}

export function emptyFolder(name = 'New Folder'): FolderNode {
  return { id: newId('fld'), type: 'folder', name, order: 0, children: [] };
}
