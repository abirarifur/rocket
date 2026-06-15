import type { CollectionNode, RequestDefinition, RequestNode } from '@rocket/types';
import type { InternalCollection } from './postman';

/** Build a collection from a HAR file (one request per logged entry). */
let idCounter = 0;
const nextId = () => `har_req_${(idCounter++).toString(36)}`;

interface Har {
  log?: {
    entries?: {
      request?: {
        method?: string;
        url?: string;
        headers?: { name: string; value: string }[];
        queryString?: { name: string; value: string }[];
        postData?: { mimeType?: string; text?: string };
      };
    }[];
  };
}

export function fromHar(har: Har): InternalCollection {
  const tree: CollectionNode[] = (har.log?.entries ?? []).map((entry) => {
    const r = entry.request ?? {};
    const isJson = r.postData?.mimeType?.includes('json');
    const node: RequestNode = {
      id: nextId(),
      type: 'request',
      order: 0,
      request: {
        name: `${r.method ?? 'GET'} ${stripQuery(r.url ?? '')}`,
        kind: 'http',
        method: (r.method ?? 'GET').toUpperCase() as RequestDefinition['method'],
        url: r.url ?? '',
        params: (r.queryString ?? []).map((q) => ({ key: q.name, value: q.value, enabled: true })),
        headers: (r.headers ?? [])
          .filter((h) => !h.name.startsWith(':')) // drop HTTP/2 pseudo-headers
          .map((h) => ({ key: h.name, value: h.value, enabled: true })),
        body: r.postData?.text
          ? { mode: 'raw', raw: r.postData.text, rawLanguage: isJson ? 'json' : 'text' }
          : { mode: 'none' },
        auth: { type: 'none' },
      },
    };
    return node;
  });

  return { name: 'Imported from HAR', variables: [], tree };
}

function stripQuery(url: string): string {
  const i = url.indexOf('?');
  return i === -1 ? url : url.slice(0, i);
}
