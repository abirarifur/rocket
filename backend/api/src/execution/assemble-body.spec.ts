import { describe, expect, it } from 'vitest';
import type { RequestDefinition } from '@rocket/types';
import { assembleBody } from './assemble-body';
import type { StorageService } from '../storage/storage.service';

// Stub storage that returns a fixed file for any key.
const storage = {
  get: async (key: string) => ({
    buffer: Buffer.from(`BYTES:${key}`),
    contentType: 'text/plain',
    filename: 'doc.txt',
  }),
} as unknown as StorageService;

const base = (body: RequestDefinition['body']): RequestDefinition => ({
  name: 't',
  method: 'POST',
  url: 'https://x.test',
  params: [],
  headers: [],
  body,
  auth: { type: 'none' },
});

describe('assembleBody', () => {
  it('returns null for non-file modes', async () => {
    expect(await assembleBody(base({ mode: 'raw', raw: 'x' }), storage)).toBeNull();
  });

  it('assembles a multipart body with text + file parts', async () => {
    const res = await assembleBody(
      base({
        mode: 'form-data',
        formData: [
          { key: 'title', value: 'Rocket', enabled: true, type: 'text' },
          { key: 'upload', value: '', enabled: true, type: 'file', fileRef: 'k1' },
          { key: 'skip', value: 'no', enabled: false, type: 'text' },
        ],
      }),
      storage,
    );
    expect(res).not.toBeNull();
    expect(res!.contentType).toMatch(/^multipart\/form-data; boundary=----RocketForm/);
    const decoded = Buffer.from(res!.bodyBase64, 'base64').toString('utf8');
    expect(decoded).toContain('name="title"');
    expect(decoded).toContain('Rocket');
    expect(decoded).toContain('name="upload"; filename="doc.txt"');
    expect(decoded).toContain('BYTES:k1');
    expect(decoded).not.toContain('name="skip"'); // disabled field omitted
  });

  it('assembles a binary body from storage', async () => {
    const res = await assembleBody(base({ mode: 'binary', binaryRef: 'b1' }), storage);
    expect(res!.contentType).toBe('text/plain');
    expect(Buffer.from(res!.bodyBase64, 'base64').toString('utf8')).toBe('BYTES:b1');
  });
});
