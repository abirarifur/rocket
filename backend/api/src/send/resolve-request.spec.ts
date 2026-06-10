import { describe, expect, it } from 'vitest';
import type { RequestDefinition } from '@rocket/types';
import { resolveRequest } from './resolve-request';

const base = (over: Partial<RequestDefinition> = {}): RequestDefinition => ({
  name: 't',
  method: 'GET',
  url: 'https://api.test/x',
  params: [],
  headers: [],
  body: { mode: 'none' },
  auth: { type: 'none' },
  ...over,
});

describe('resolveRequest', () => {
  it('merges enabled params into the URL and skips disabled/empty', () => {
    const r = resolveRequest(
      base({
        url: 'https://api.test/x?a=1',
        params: [
          { key: 'b', value: '2', enabled: true },
          { key: 'c', value: '3', enabled: false },
          { key: '', value: 'x', enabled: true },
        ],
      }),
    );
    expect(r.url).toBe('https://api.test/x?a=1&b=2');
  });

  it('collects enabled headers only', () => {
    const r = resolveRequest(
      base({
        headers: [
          { key: 'X-A', value: '1', enabled: true },
          { key: 'X-B', value: '2', enabled: false },
        ],
      }),
    );
    expect(r.headers['X-A']).toBe('1');
    expect(r.headers['X-B']).toBeUndefined();
  });

  it('serializes raw json body and sets content-type', () => {
    const r = resolveRequest(base({ method: 'POST', body: { mode: 'raw', raw: '{"a":1}', rawLanguage: 'json' } }));
    expect(r.body).toBe('{"a":1}');
    expect(r.headers['Content-Type']).toBe('application/json');
  });

  it('does not override an explicit content-type', () => {
    const r = resolveRequest(
      base({
        method: 'POST',
        headers: [{ key: 'Content-Type', value: 'text/plain', enabled: true }],
        body: { mode: 'raw', raw: 'x', rawLanguage: 'json' },
      }),
    );
    expect(r.headers['Content-Type']).toBe('text/plain');
  });

  it('serializes urlencoded body', () => {
    const r = resolveRequest(
      base({
        method: 'POST',
        body: { mode: 'urlencoded', urlencoded: [{ key: 'a', value: 'b c', enabled: true }] },
      }),
    );
    expect(r.body).toBe('a=b%20c');
    expect(r.headers['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('applies basic, bearer and apikey auth', () => {
    expect(resolveRequest(base({ auth: { type: 'bearer', bearer: { token: 'T' } } })).headers['Authorization']).toBe(
      'Bearer T',
    );
    const basic = resolveRequest(base({ auth: { type: 'basic', basic: { username: 'u', password: 'p' } } }));
    expect(basic.headers['Authorization']).toBe(`Basic ${Buffer.from('u:p').toString('base64')}`);
    const inHeader = resolveRequest(
      base({ auth: { type: 'apikey', apikey: { key: 'X-Key', value: 'k', in: 'header' } } }),
    );
    expect(inHeader.headers['X-Key']).toBe('k');
    const inQuery = resolveRequest(
      base({ url: 'https://api.test/x', auth: { type: 'apikey', apikey: { key: 'api_key', value: 'k', in: 'query' } } }),
    );
    expect(inQuery.url).toBe('https://api.test/x?api_key=k');
  });

  it('marks utf8 encoding by default', () => {
    expect(resolveRequest(base()).bodyEncoding).toBe('utf8');
  });
});
