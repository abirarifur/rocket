import { describe, expect, it } from 'vitest';
import { fromPostman, toPostman, type InternalCollection } from './postman';
import { parseCurl } from './curl';

const sample: InternalCollection = {
  name: 'My API',
  description: 'desc',
  variables: [{ key: 'base_url', value: 'https://x.test', enabled: true, secret: false }],
  tree: [
    {
      id: 'f1',
      type: 'folder',
      name: 'Users',
      order: 0,
      children: [
        {
          id: 'r1',
          type: 'request',
          order: 0,
          request: {
            name: 'Get user',
            method: 'GET',
            url: '{{base_url}}/users',
            params: [{ key: 'page', value: '1', enabled: true }],
            headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
            body: { mode: 'none' },
            auth: { type: 'bearer', bearer: { token: 'tok' } },
            testScript: 'pm.test("ok", () => pm.response.to.have.status(200));',
          },
        },
        {
          id: 'r2',
          type: 'request',
          order: 1,
          request: {
            name: 'Create user',
            method: 'POST',
            url: '{{base_url}}/users',
            params: [],
            headers: [],
            body: { mode: 'raw', raw: '{"name":"a"}', rawLanguage: 'json' },
            auth: { type: 'none' },
          },
        },
      ],
    },
  ],
};

describe('Postman v2.1 round-trip', () => {
  it('exports then re-imports without losing structure', () => {
    const postman = toPostman(sample);
    const back = fromPostman(postman as Parameters<typeof fromPostman>[0]);

    expect(back.name).toBe('My API');
    expect(back.variables[0]?.key).toBe('base_url');
    const folder = back.tree[0];
    expect(folder?.type).toBe('folder');
    if (folder?.type !== 'folder') throw new Error();
    expect(folder.name).toBe('Users');
    expect(folder.children).toHaveLength(2);

    const r1 = folder.children[0];
    if (r1?.type !== 'request') throw new Error();
    expect(r1.request.method).toBe('GET');
    expect(r1.request.url).toBe('{{base_url}}/users');
    expect(r1.request.params[0]).toMatchObject({ key: 'page', value: '1' });
    expect(r1.request.headers[0]).toMatchObject({ key: 'Accept' });
    expect(r1.request.auth.type).toBe('bearer');
    expect(r1.request.auth.bearer?.token).toBe('tok');
    expect(r1.request.testScript).toContain('pm.test');

    const r2 = folder.children[1];
    if (r2?.type !== 'request') throw new Error();
    expect(r2.request.body.mode).toBe('raw');
    expect(r2.request.body.raw).toBe('{"name":"a"}');
  });
});

describe('parseCurl', () => {
  it('parses method, headers, json body', () => {
    const req = parseCurl(
      `curl -X POST https://api.test/v1/items -H 'Content-Type: application/json' -H "X-Key: abc" -d '{"a":1}'`,
    );
    expect(req.method).toBe('POST');
    expect(req.url).toBe('https://api.test/v1/items');
    expect(req.headers.find((h) => h.key === 'X-Key')?.value).toBe('abc');
    expect(req.body.mode).toBe('raw');
    expect(req.body.raw).toBe('{"a":1}');
  });

  it('infers POST from data and parses basic auth', () => {
    const req = parseCurl(`curl https://api.test -u user:pass -d hello=world -H "Content-Type: application/x-www-form-urlencoded"`);
    expect(req.method).toBe('POST');
    expect(req.auth.type).toBe('basic');
    expect(req.auth.basic?.username).toBe('user');
    expect(req.body.mode).toBe('urlencoded');
    expect(req.body.urlencoded?.[0]).toMatchObject({ key: 'hello', value: 'world' });
  });
});
