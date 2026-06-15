import type { CollectionNode, FolderNode, RequestDefinition, RequestNode } from '@rocket/types';
import type { InternalCollection } from './postman';

/**
 * Build a collection from an OpenAPI 3.x (or Swagger 2.0) document. One request
 * per operation, grouped into folders by first tag. The server URL becomes a
 * `{{baseUrl}}` collection variable.
 */
const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;

let idCounter = 0;
const nextId = (p: string) => `oa_${p}_${(idCounter++).toString(36)}`;

interface OpenApiDoc {
  openapi?: string;
  swagger?: string;
  info?: { title?: string; description?: string };
  servers?: { url?: string }[];
  host?: string;
  basePath?: string;
  schemes?: string[];
  paths?: Record<string, Record<string, OpenApiOp>>;
}
interface OpenApiOp {
  summary?: string;
  operationId?: string;
  tags?: string[];
  parameters?: { name?: string; in?: string; example?: unknown; schema?: { example?: unknown } }[];
  requestBody?: {
    content?: Record<string, { example?: unknown; schema?: { example?: unknown } }>;
  };
}

export function fromOpenApi(doc: OpenApiDoc): InternalCollection {
  const baseUrl = resolveServer(doc);
  const folders = new Map<string, RequestNode[]>();

  for (const [path, ops] of Object.entries(doc.paths ?? {})) {
    for (const method of METHODS) {
      const op = ops[method];
      if (!op) continue;
      const tag = op.tags?.[0] ?? 'default';
      const node: RequestNode = {
        id: nextId('req'),
        type: 'request',
        order: 0,
        request: buildRequest(method.toUpperCase(), path, op),
      };
      if (!folders.has(tag)) folders.set(tag, []);
      folders.get(tag)!.push(node);
    }
  }

  const tree: CollectionNode[] = [...folders.entries()].map(([tag, reqs]) => {
    const folder: FolderNode = { id: nextId('fld'), type: 'folder', name: tag, order: 0, children: reqs };
    return folder;
  });

  return {
    name: doc.info?.title ?? 'Imported API',
    description: doc.info?.description,
    variables: [{ key: 'baseUrl', value: baseUrl, enabled: true, secret: false }],
    tree,
  };
}

function resolveServer(doc: OpenApiDoc): string {
  if (doc.servers?.[0]?.url) return doc.servers[0].url;
  if (doc.host) {
    const scheme = doc.schemes?.[0] ?? 'https';
    return `${scheme}://${doc.host}${doc.basePath ?? ''}`;
  }
  return 'https://api.example.com';
}

function buildRequest(method: string, path: string, op: OpenApiOp): RequestDefinition {
  const queryParams = (op.parameters ?? []).filter((p) => p.in === 'query');
  const headerParams = (op.parameters ?? []).filter((p) => p.in === 'header');
  const example = (p: { example?: unknown; schema?: { example?: unknown } }) =>
    String(p.example ?? p.schema?.example ?? '');

  const jsonBody = op.requestBody?.content?.['application/json'];
  const bodyExample = jsonBody?.example ?? jsonBody?.schema?.example;

  return {
    name: op.summary ?? op.operationId ?? `${method} ${path}`,
    kind: 'http',
    method: method as RequestDefinition['method'],
    url: `{{baseUrl}}${path}`,
    params: queryParams.map((p) => ({ key: p.name ?? '', value: example(p), enabled: true })),
    headers: headerParams.map((p) => ({ key: p.name ?? '', value: example(p), enabled: true })),
    body: bodyExample
      ? { mode: 'raw', raw: JSON.stringify(bodyExample, null, 2), rawLanguage: 'json' }
      : { mode: 'none' },
    auth: { type: 'none' },
  };
}
