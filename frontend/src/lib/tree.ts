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

let counter = 0;
/** Client-side id for new nodes (server stores them verbatim in the tree JSON). */
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}_${counter}`;
}

export function emptyRequestNode(name = 'New Request'): RequestNode {
  return {
    id: newId('req'),
    type: 'request',
    order: 0,
    request: {
      name,
      method: 'GET',
      url: '',
      params: [],
      headers: [],
      body: { mode: 'none' },
      auth: { type: 'none' },
    },
  };
}

export function emptyFolder(name = 'New Folder'): FolderNode {
  return { id: newId('fld'), type: 'folder', name, order: 0, children: [] };
}
