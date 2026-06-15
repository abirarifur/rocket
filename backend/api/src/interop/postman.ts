import type {
  CollectionNode,
  FolderNode,
  KeyValue,
  RequestAuth,
  RequestBody,
  RequestDefinition,
  RequestNode,
  Variable,
} from '@rocket/types';

/**
 * Converters between our internal collection shape and the Postman Collection
 * Format v2.1, so import/export round-trips with real Postman.
 */

export interface InternalCollection {
  name: string;
  description?: string;
  variables: Variable[];
  tree: CollectionNode[];
}

let idCounter = 0;
const nextId = (p: string) => `${p}_${(idCounter++).toString(36)}`;

// ── Export: internal -> Postman ───────────────────────────────────────────

export function toPostman(col: InternalCollection): unknown {
  return {
    info: {
      name: col.name,
      description: col.description,
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    item: col.tree.map(nodeToItem),
    variable: col.variables.map((v) => ({ key: v.key, value: v.value })),
  };
}

function nodeToItem(node: CollectionNode): unknown {
  if (node.type === 'folder') {
    return { name: node.name, description: node.description, item: node.children.map(nodeToItem) };
  }
  return requestToItem(node.request);
}

function requestToItem(req: RequestDefinition): unknown {
  const events: unknown[] = [];
  if (req.preRequestScript?.trim())
    events.push({ listen: 'prerequest', script: { type: 'text/javascript', exec: req.preRequestScript.split('\n') } });
  if (req.testScript?.trim())
    events.push({ listen: 'test', script: { type: 'text/javascript', exec: req.testScript.split('\n') } });

  return {
    name: req.name,
    request: {
      method: req.method,
      header: req.headers.map((h) => ({ key: h.key, value: h.value, disabled: !h.enabled })),
      url: toPostmanUrl(req.url, req.params),
      body: toPostmanBody(req.body),
      auth: toPostmanAuth(req.auth),
      description: req.description,
    },
    event: events.length ? events : undefined,
  };
}

function toPostmanUrl(rawUrl: string, params: KeyValue[]): unknown {
  return {
    raw: rawUrl,
    query: params.map((p) => ({ key: p.key, value: p.value, disabled: !p.enabled })),
  };
}

function toPostmanBody(body: RequestBody): unknown {
  switch (body.mode) {
    case 'raw':
      return { mode: 'raw', raw: body.raw ?? '', options: { raw: { language: body.rawLanguage ?? 'text' } } };
    case 'urlencoded':
      return {
        mode: 'urlencoded',
        urlencoded: (body.urlencoded ?? []).map((p) => ({ key: p.key, value: p.value, disabled: !p.enabled })),
      };
    case 'graphql':
      return { mode: 'graphql', graphql: { query: body.graphql?.query ?? '', variables: body.graphql?.variables ?? '' } };
    case 'none':
    default:
      return undefined;
  }
}

function toPostmanAuth(auth: RequestAuth): unknown {
  switch (auth.type) {
    case 'basic':
      return {
        type: 'basic',
        basic: [
          { key: 'username', value: auth.basic?.username ?? '' },
          { key: 'password', value: auth.basic?.password ?? '' },
        ],
      };
    case 'bearer':
      return { type: 'bearer', bearer: [{ key: 'token', value: auth.bearer?.token ?? '' }] };
    case 'apikey':
      return {
        type: 'apikey',
        apikey: [
          { key: 'key', value: auth.apikey?.key ?? '' },
          { key: 'value', value: auth.apikey?.value ?? '' },
          { key: 'in', value: auth.apikey?.in ?? 'header' },
        ],
      };
    default:
      return undefined;
  }
}

// ── Import: Postman -> internal ───────────────────────────────────────────

interface PostmanDoc {
  info?: { name?: string; description?: string };
  item?: PostmanItem[];
  variable?: { key: string; value?: string }[];
}
interface PostmanItem {
  name?: string;
  description?: string;
  item?: PostmanItem[];
  request?: PostmanRequest;
  event?: { listen: string; script?: { exec?: string[] | string } }[];
}
interface PostmanRequest {
  method?: string;
  header?: { key: string; value?: string; disabled?: boolean }[];
  url?: string | { raw?: string; query?: { key: string; value?: string; disabled?: boolean }[] };
  body?: {
    mode?: string;
    raw?: string;
    options?: { raw?: { language?: string } };
    urlencoded?: { key: string; value?: string; disabled?: boolean }[];
    graphql?: { query?: string; variables?: string };
  };
  auth?: { type?: string; basic?: KV[]; bearer?: KV[]; apikey?: KV[] };
  description?: string;
}
type KV = { key: string; value?: string };

export function fromPostman(doc: PostmanDoc): InternalCollection {
  return {
    name: doc.info?.name ?? 'Imported Collection',
    description: doc.info?.description,
    variables: (doc.variable ?? []).map((v) => ({
      key: v.key,
      value: v.value ?? '',
      enabled: true,
      secret: false,
    })),
    tree: (doc.item ?? []).map(itemToNode),
  };
}

function itemToNode(item: PostmanItem): CollectionNode {
  if (item.item) {
    const folder: FolderNode = {
      id: nextId('fld'),
      type: 'folder',
      name: item.name ?? 'Folder',
      description: item.description,
      order: 0,
      children: item.item.map(itemToNode),
    };
    return folder;
  }
  const node: RequestNode = {
    id: nextId('req'),
    type: 'request',
    order: 0,
    request: requestFromItem(item),
  };
  return node;
}

function requestFromItem(item: PostmanItem): RequestDefinition {
  const r = item.request ?? {};
  const url = typeof r.url === 'string' ? r.url : (r.url?.raw ?? '');
  const query = typeof r.url === 'object' ? (r.url.query ?? []) : [];
  const exec = (listen: string) => {
    const e = item.event?.find((ev) => ev.listen === listen)?.script?.exec;
    return Array.isArray(e) ? e.join('\n') : (e ?? undefined);
  };

  return {
    name: item.name ?? 'Imported Request',
    kind: 'http',
    method: (r.method ?? 'GET').toUpperCase() as RequestDefinition['method'],
    url,
    params: query.map((q) => ({ key: q.key, value: q.value ?? '', enabled: !q.disabled })),
    headers: (r.header ?? []).map((h) => ({ key: h.key, value: h.value ?? '', enabled: !h.disabled })),
    body: bodyFromPostman(r.body),
    auth: authFromPostman(r.auth),
    description: r.description,
    preRequestScript: exec('prerequest'),
    testScript: exec('test'),
  };
}

function bodyFromPostman(body: PostmanRequest['body']): RequestBody {
  if (!body || !body.mode) return { mode: 'none' };
  switch (body.mode) {
    case 'raw':
      return {
        mode: 'raw',
        raw: body.raw ?? '',
        rawLanguage: (body.options?.raw?.language as RequestBody['rawLanguage']) ?? 'text',
      };
    case 'urlencoded':
      return {
        mode: 'urlencoded',
        urlencoded: (body.urlencoded ?? []).map((p) => ({
          key: p.key,
          value: p.value ?? '',
          enabled: !p.disabled,
        })),
      };
    case 'graphql':
      return { mode: 'graphql', graphql: { query: body.graphql?.query ?? '', variables: body.graphql?.variables } };
    default:
      return { mode: 'none' };
  }
}

function kv(list: KV[] | undefined, key: string): string {
  return list?.find((i) => i.key === key)?.value ?? '';
}

function authFromPostman(auth: PostmanRequest['auth']): RequestAuth {
  switch (auth?.type) {
    case 'basic':
      return { type: 'basic', basic: { username: kv(auth.basic, 'username'), password: kv(auth.basic, 'password') } };
    case 'bearer':
      return { type: 'bearer', bearer: { token: kv(auth.bearer, 'token') } };
    case 'apikey':
      return {
        type: 'apikey',
        apikey: {
          key: kv(auth.apikey, 'key'),
          value: kv(auth.apikey, 'value'),
          in: (kv(auth.apikey, 'in') as 'header' | 'query') || 'header',
        },
      };
    default:
      return { type: 'none' };
  }
}
