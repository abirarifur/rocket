import { afterEach, describe, expect, it } from 'vitest';
import { buildAuthorizeUrl, callbackUrl, configuredProviders, getProviderConfig } from './providers';

describe('oauth providers', () => {
  afterEach(() => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    delete process.env.MOCK_OAUTH;
  });

  it('reports a provider as unconfigured without credentials', () => {
    expect(getProviderConfig('google')).toBeNull();
    expect(configuredProviders()).not.toContain('google');
  });

  it('includes the mock provider only when MOCK_OAUTH=1', () => {
    expect(configuredProviders()).not.toContain('mock');
    process.env.MOCK_OAUTH = '1';
    expect(configuredProviders()).toContain('mock');
  });

  it('builds a correct authorize URL when configured', () => {
    process.env.GOOGLE_CLIENT_ID = 'cid';
    process.env.GOOGLE_CLIENT_SECRET = 'secret';
    const url = new URL(buildAuthorizeUrl('google', 'st4te'));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('state')).toBe('st4te');
    expect(url.searchParams.get('redirect_uri')).toBe(callbackUrl('google'));
    expect(url.searchParams.get('scope')).toContain('email');
  });
});
