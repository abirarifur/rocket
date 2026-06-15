import { describe, expect, it } from 'vitest';
import type { RequestDefinition, Variable } from '@rocket/types';
import { interpolate, interpolateRequest, resolveVariableMap } from './interpolate';

const v = (key: string, value: string, enabled = true): Variable => ({ key, value, enabled, secret: false });

describe('resolveVariableMap', () => {
  it('applies precedence (later scopes win)', () => {
    const map = resolveVariableMap([v('a', 'collection'), v('b', 'c')], [v('a', 'environment')]);
    expect(map.a).toBe('environment'); // env overrides collection
    expect(map.b).toBe('c');
  });

  it('ignores disabled and empty-key variables', () => {
    const map = resolveVariableMap([v('x', '1', false), v('', '2')]);
    expect(map.x).toBeUndefined();
    expect(map['']).toBeUndefined();
  });
});

describe('interpolate', () => {
  it('replaces known tokens and leaves unknown intact', () => {
    expect(interpolate('{{a}}/{{b}}', { a: '1' })).toBe('1/{{b}}');
  });
  it('handles whitespace inside braces', () => {
    expect(interpolate('{{ a }}', { a: 'X' })).toBe('X');
  });
});

describe('interpolateRequest', () => {
  it('interpolates url, params, headers, body and auth', () => {
    const def: RequestDefinition = {
      name: 't',
      kind: 'http',
      method: 'GET',
      url: '{{base}}/items',
      params: [{ key: 'q', value: '{{term}}', enabled: true }],
      headers: [{ key: 'Authorization', value: 'Bearer {{token}}', enabled: true }],
      body: { mode: 'raw', raw: '{"id":"{{id}}"}', rawLanguage: 'json' },
      auth: { type: 'bearer', bearer: { token: '{{token}}' } },
    };
    const out = interpolateRequest(def, { base: 'https://x.test', term: 'rocket', token: 'T', id: '42' });
    expect(out.url).toBe('https://x.test/items');
    expect(out.params[0]?.value).toBe('rocket');
    expect(out.headers[0]?.value).toBe('Bearer T');
    expect(out.body.raw).toBe('{"id":"42"}');
    expect(out.auth.bearer?.token).toBe('T');
  });
});
