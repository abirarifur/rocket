/** OAuth provider definitions and profile normalization. */

export interface OAuthProfile {
  providerAccountId: string;
  email: string;
  name?: string;
}

export interface ProviderConfig {
  id: string;
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
}

/** Returns the configured providers (only those with client id + secret set). */
export function configuredProviders(): string[] {
  const ids = ['google', 'github'];
  const list = ids.filter((id) => getProviderConfig(id));
  // A dev-only mock provider for local testing without real credentials.
  if (process.env.MOCK_OAUTH === '1' && process.env.NODE_ENV !== 'production') list.push('mock');
  return list;
}

export function getProviderConfig(provider: string): ProviderConfig | null {
  if (provider === 'google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    return {
      id: 'google',
      clientId,
      clientSecret,
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      scope: 'openid email profile',
    };
  }
  if (provider === 'github') {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    return {
      id: 'github',
      clientId,
      clientSecret,
      authorizeUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scope: 'read:user user:email',
    };
  }
  return null;
}

export function callbackUrl(provider: string): string {
  const base = process.env.OAUTH_CALLBACK_BASE ?? 'http://localhost:4000';
  return `${base}/api/auth/oauth/${provider}/callback`;
}

export function buildAuthorizeUrl(provider: string, state: string): string {
  const cfg = getProviderConfig(provider);
  if (!cfg) throw new Error(`Provider ${provider} is not configured`);
  const params = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: callbackUrl(provider),
    response_type: 'code',
    scope: cfg.scope,
    state,
  });
  return `${cfg.authorizeUrl}?${params.toString()}`;
}

/** Exchange an authorization code for an access token. */
export async function exchangeCode(provider: string, code: string): Promise<string> {
  const cfg = getProviderConfig(provider);
  if (!cfg) throw new Error(`Provider ${provider} is not configured`);
  const res = await fetch(cfg.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      code,
      redirect_uri: callbackUrl(provider),
      grant_type: 'authorization_code',
    }).toString(),
  });
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('Token exchange failed');
  return data.access_token;
}

/** Fetch and normalize the user profile from the provider. */
export async function fetchProfile(provider: string, accessToken: string): Promise<OAuthProfile> {
  if (provider === 'google') {
    const res = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const u = (await res.json()) as { sub: string; email: string; name?: string };
    return { providerAccountId: u.sub, email: u.email, name: u.name };
  }
  if (provider === 'github') {
    const headers = { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' };
    const u = (await (await fetch('https://api.github.com/user', { headers })).json()) as {
      id: number;
      email?: string;
      name?: string;
      login?: string;
    };
    let email = u.email;
    if (!email) {
      const emails = (await (await fetch('https://api.github.com/user/emails', { headers })).json()) as {
        email: string;
        primary: boolean;
        verified: boolean;
      }[];
      email = emails.find((e) => e.primary && e.verified)?.email ?? emails[0]?.email;
    }
    return { providerAccountId: String(u.id), email: email ?? `${u.login}@users.noreply.github.com`, name: u.name ?? u.login };
  }
  throw new Error(`Provider ${provider} is not configured`);
}
