import { describe, expect, it } from 'vitest';
import { assertSafeUrl } from './ssrf.js';

describe('assertSafeUrl', () => {
  it('blocks the cloud metadata endpoint', async () => {
    const v = await assertSafeUrl('http://169.254.169.254/latest/meta-data/');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('BLOCKED_SSRF');
  });

  it('blocks loopback', async () => {
    const v = await assertSafeUrl('http://127.0.0.1:8080/admin');
    expect(v.ok).toBe(false);
  });

  it('blocks private ranges', async () => {
    for (const url of ['http://10.0.0.5/', 'http://192.168.1.1/', 'http://172.16.0.1/']) {
      const v = await assertSafeUrl(url);
      expect(v.ok, url).toBe(false);
    }
  });

  it('blocks IPv4-mapped IPv6 metadata address', async () => {
    const v = await assertSafeUrl('http://[::ffff:169.254.169.254]/');
    expect(v.ok).toBe(false);
  });

  it('rejects non-http schemes', async () => {
    const v = await assertSafeUrl('file:///etc/passwd');
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe('INVALID_URL');
  });

  it('allows a public IP literal', async () => {
    const v = await assertSafeUrl('https://1.1.1.1/');
    expect(v.ok).toBe(true);
  });
});
