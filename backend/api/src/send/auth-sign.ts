import { createHash, createHmac, createSign, randomBytes } from 'node:crypto';
import type { RequestAuth } from '@rocket/types';

/**
 * Single-pass signers for the auth schemes that can be computed without a network
 * round-trip. Each helper mutates the outgoing `headers` map in place and returns
 * the (possibly updated) URL — auth that targets query params appends to it.
 *
 * Not handled here (require a challenge/handshake or interactive grant): digest,
 * NTLM, Akamai EdgeGrid, ASAP. Those are stored on the request but not applied.
 */

type Headers = Record<string, string>;

function rfc3986(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function appendQuery(url: string, key: string, value: string): string {
  return url + (url.includes('?') ? '&' : '?') + `${rfc3986(key)}=${rfc3986(value)}`;
}

function base64url(input: Buffer): string {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function headerValue(headers: Headers, name: string): string | undefined {
  const lower = name.toLowerCase();
  const key = Object.keys(headers).find((k) => k.toLowerCase() === lower);
  return key ? headers[key] : undefined;
}

/** Place a finished token either in a header or as a query param. */
function placeToken(
  headers: Headers,
  url: string,
  addTo: 'header' | 'query',
  opts: { headerName?: string; prefix?: string; queryKey?: string; token: string },
): string {
  if (addTo === 'query') return appendQuery(url, opts.queryKey ?? 'token', opts.token);
  headers[opts.headerName || 'Authorization'] = opts.prefix
    ? `${opts.prefix} ${opts.token}`
    : opts.token;
  return url;
}

/** Sign a JWT from a JSON payload using HMAC (HS*) or an RSA private key (RS*). */
export function signJwt(cfg: NonNullable<RequestAuth['jwt']>): string {
  const header = { alg: cfg.algorithm, typ: 'JWT' };
  let payload: Record<string, unknown> = {};
  try {
    payload = cfg.payload ? (JSON.parse(cfg.payload) as Record<string, unknown>) : {};
  } catch {
    payload = {};
  }
  const signingInput =
    base64url(Buffer.from(JSON.stringify(header))) +
    '.' +
    base64url(Buffer.from(JSON.stringify(payload)));

  if (cfg.algorithm.startsWith('HS')) {
    const hash = 'sha' + cfg.algorithm.slice(2); // HS256 -> sha256
    const key = cfg.isSecretBase64 ? Buffer.from(cfg.secret, 'base64') : cfg.secret;
    const sig = createHmac(hash, key).update(signingInput).digest();
    return `${signingInput}.${base64url(sig)}`;
  }
  // RS*: sign with an RSA private key (PEM).
  const signer = createSign('RSA-SHA' + cfg.algorithm.slice(2));
  signer.update(signingInput);
  signer.end();
  const sig = signer.sign(cfg.secret);
  return `${signingInput}.${base64url(sig)}`;
}

export function applyJwt(headers: Headers, url: string, cfg: NonNullable<RequestAuth['jwt']>): string {
  const token = signJwt(cfg);
  return placeToken(headers, url, cfg.addTo, {
    headerName: cfg.headerName,
    prefix: cfg.headerPrefix,
    queryKey: cfg.queryParamKey,
    token,
  });
}

export function applyOauth2(
  headers: Headers,
  url: string,
  cfg: NonNullable<RequestAuth['oauth2']>,
): string {
  if (!cfg.accessToken) return url;
  return placeToken(headers, url, cfg.addTo, {
    prefix: cfg.headerPrefix,
    queryKey: cfg.queryParamKey,
    token: cfg.accessToken,
  });
}

/** OAuth 1.0a request signing (HMAC-SHA1/256 or PLAINTEXT). */
export function applyOauth1(
  headers: Headers,
  url: string,
  method: string,
  body: string | null,
  cfg: NonNullable<RequestAuth['oauth1']>,
): string {
  const u = new URL(url);
  const oauth: Record<string, string> = {
    oauth_consumer_key: cfg.consumerKey,
    oauth_nonce: randomBytes(16).toString('hex'),
    oauth_signature_method: cfg.signatureMethod,
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
  };
  if (cfg.token) oauth.oauth_token = cfg.token;

  let signature: string;
  if (cfg.signatureMethod === 'PLAINTEXT') {
    signature = `${rfc3986(cfg.consumerSecret)}&${rfc3986(cfg.tokenSecret)}`;
  } else {
    const params: [string, string][] = [];
    u.searchParams.forEach((v, k) => params.push([k, v]));
    Object.entries(oauth).forEach(([k, v]) => params.push([k, v]));
    const ct = headerValue(headers, 'content-type');
    if (ct?.includes('application/x-www-form-urlencoded') && body) {
      new URLSearchParams(body).forEach((v, k) => params.push([k, v]));
    }
    const baseParams = params
      .map(([k, v]) => [rfc3986(k), rfc3986(v)] as [string, string])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1))
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    const baseUrl = `${u.protocol}//${u.host}${u.pathname}`;
    const baseString = [method.toUpperCase(), rfc3986(baseUrl), rfc3986(baseParams)].join('&');
    const signingKey = `${rfc3986(cfg.consumerSecret)}&${rfc3986(cfg.tokenSecret)}`;
    const hash = cfg.signatureMethod === 'HMAC-SHA256' ? 'sha256' : 'sha1';
    signature = createHmac(hash, signingKey).update(baseString).digest('base64');
  }
  oauth.oauth_signature = signature;

  if (cfg.addTo === 'query') {
    let next = url;
    for (const [k, v] of Object.entries(oauth)) next = appendQuery(next, k, v);
    return next;
  }
  const realm = cfg.realm ? `realm="${rfc3986(cfg.realm)}", ` : '';
  headers['Authorization'] =
    'OAuth ' +
    realm +
    Object.entries(oauth)
      .map(([k, v]) => `${rfc3986(k)}="${rfc3986(v)}"`)
      .join(', ');
  return url;
}

/** AWS Signature Version 4. Mutates headers; URL is unchanged. */
export function applyAwsV4(
  headers: Headers,
  url: string,
  method: string,
  body: string | null,
  cfg: NonNullable<RequestAuth['awsv4']>,
): void {
  const u = new URL(url);
  const region = cfg.region || 'us-east-1';
  const service = cfg.service || u.hostname.split('.')[0] || 'execute-api';
  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ''); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = createHash('sha256').update(body ?? '', 'utf8').digest('hex');

  headers['X-Amz-Date'] = amzDate;
  headers['x-amz-content-sha256'] = payloadHash;
  if (cfg.sessionToken) headers['X-Amz-Security-Token'] = cfg.sessionToken;

  const signMap: Record<string, string> = {
    host: u.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  };
  if (cfg.sessionToken) signMap['x-amz-security-token'] = cfg.sessionToken;
  const signedKeys = Object.keys(signMap).sort();
  const canonicalHeaders = signedKeys.map((k) => `${k}:${(signMap[k] ?? '').trim()}\n`).join('');
  const signedHeaders = signedKeys.join(';');

  const canonicalQuery = [...u.searchParams.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1))
    .map(([k, v]) => `${rfc3986(k)}=${rfc3986(v)}`)
    .join('&');

  const canonicalRequest = [
    method.toUpperCase(),
    u.pathname || '/',
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n');

  const kDate = createHmac('sha256', 'AWS4' + cfg.secretKey).update(dateStamp).digest();
  const kRegion = createHmac('sha256', kDate).update(region).digest();
  const kService = createHmac('sha256', kRegion).update(service).digest();
  const kSigning = createHmac('sha256', kService).update('aws4_request').digest();
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');

  headers['Authorization'] =
    `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

/** Hawk request MAC (header scheme). Mutates headers. */
export function applyHawk(
  headers: Headers,
  url: string,
  method: string,
  cfg: NonNullable<RequestAuth['hawk']>,
): void {
  const u = new URL(url);
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = cfg.nonce || randomBytes(6).toString('hex');
  const port = u.port || (u.protocol === 'https:' ? '443' : '80');
  const resource = u.pathname + (u.search || '');
  const appDlg = cfg.app ? `${cfg.app}\n${cfg.dlg || ''}\n` : '';
  const normalized =
    `hawk.1.header\n${ts}\n${nonce}\n${method.toUpperCase()}\n${resource}\n` +
    `${u.hostname}\n${port}\n\n${cfg.extData || ''}\n${appDlg}`;
  const mac = createHmac(cfg.algorithm === 'sha1' ? 'sha1' : 'sha256', cfg.authKey)
    .update(normalized)
    .digest('base64');

  let header = `Hawk id="${cfg.authId}", ts="${ts}", nonce="${nonce}"`;
  if (cfg.extData) header += `, ext="${cfg.extData}"`;
  header += `, mac="${mac}"`;
  if (cfg.app) header += `, app="${cfg.app}"`;
  if (cfg.dlg) header += `, dlg="${cfg.dlg}"`;
  headers['Authorization'] = header;
}
