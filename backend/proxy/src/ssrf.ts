import { lookup } from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

/**
 * SSRF defense for the proxy. We refuse requests that target private,
 * loopback, link-local, or otherwise non-public address space — even if the
 * hostname resolves to such an address (DNS-rebinding protection).
 *
 * Only http/https are permitted.
 */

const BLOCKED_RANGES = [
  'unspecified', // 0.0.0.0/::
  'loopback', // 127.0.0.0/8, ::1
  'linkLocal', // 169.254.0.0/16, fe80::/10 (covers cloud metadata 169.254.169.254)
  'uniqueLocal', // fc00::/7
  'private', // 10/8, 172.16/12, 192.168/16
  'reserved',
  'broadcast',
  'carrierGradeNat',
] as const;

export type SsrfVerdict = { ok: true; resolvedIps: string[] } | { ok: false; reason: string };

function isBlockedAddress(ip: string): boolean {
  let addr: ipaddr.IPv4 | ipaddr.IPv6;
  try {
    addr = ipaddr.parse(ip);
  } catch {
    return true; // unparseable → treat as unsafe
  }
  // Normalize IPv4-mapped IPv6 (e.g. ::ffff:169.254.169.254) to IPv4.
  if (addr.kind() === 'ipv6' && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
    addr = (addr as ipaddr.IPv6).toIPv4Address();
  }
  const range = addr.range();
  return (BLOCKED_RANGES as readonly string[]).includes(range);
}

/**
 * Validate a target URL before the proxy connects. Resolves the hostname and
 * checks every returned address against the blocklist.
 */
export async function assertSafeUrl(rawUrl: string): Promise<SsrfVerdict> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: 'INVALID_URL' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'INVALID_URL' };
  }

  const host = url.hostname;

  // If the host is already a literal IP, check it directly.
  if (ipaddr.isValid(host)) {
    return isBlockedAddress(host)
      ? { ok: false, reason: 'BLOCKED_SSRF' }
      : { ok: true, resolvedIps: [host] };
  }

  // Otherwise resolve all addresses and ensure none are blocked.
  let records: { address: string }[];
  try {
    records = await lookup(host, { all: true });
  } catch {
    return { ok: false, reason: 'CONNECTION_FAILED' };
  }

  if (records.length === 0) {
    return { ok: false, reason: 'CONNECTION_FAILED' };
  }

  for (const { address } of records) {
    if (isBlockedAddress(address)) {
      return { ok: false, reason: 'BLOCKED_SSRF' };
    }
  }

  return { ok: true, resolvedIps: records.map((r) => r.address) };
}
