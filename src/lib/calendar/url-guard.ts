// src/lib/calendar/url-guard.ts — SSRF protection for user-supplied URLs (ICS feeds)

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const PRIVATE_V4_RANGES: [number, number][] = [
  [0x0a000000, 0x0affffff], // 10.0.0.0/8
  [0xac100000, 0xac1fffff], // 172.16.0.0/12
  [0xc0a80000, 0xc0a8ffff], // 192.168.0.0/16
  [0x7f000000, 0x7fffffff], // 127.0.0.0/8 loopback
  [0xa9fe0000, 0xa9feffff], // 169.254.0.0/16 link-local (incl. cloud metadata)
  [0x64400000, 0x647fffff], // 100.64.0.0/10 CGNAT
  [0x00000000, 0x00ffffff], // 0.0.0.0/8
];

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

function isPrivateV4(ip: string): boolean {
  const n = ipv4ToInt(ip);
  if (n === null) return true; // unparseable → treat as private
  return PRIVATE_V4_RANGES.some(([lo, hi]) => n >= lo && n <= hi);
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 ULA
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice(7);
    return isPrivateV4(v4);
  }
  return false;
}

function isBlockedHost(host: string): boolean {
  const lower = host.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) return true;
  if (lower.endsWith(".local")) return true; // mDNS
  if (lower.endsWith(".internal")) return true; // GCP/cluster internal
  return false;
}

export class UrlGuardError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UrlGuardError";
  }
}

/**
 * Validate a user-supplied URL for SSRF safety.
 * - Only http/https
 * - Hostname must not be localhost/.local/.internal
 * - Resolved IPs must not be private/loopback/link-local
 *
 * Throws UrlGuardError on rejection. Returns the resolved IPs on success
 * (caller may want to pin the request to a specific resolved address).
 */
export async function assertSafeRemoteUrl(rawUrl: string): Promise<string[]> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new UrlGuardError("Invalid URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new UrlGuardError(`Unsupported protocol: ${parsed.protocol}`);
  }

  const host = parsed.hostname;
  if (!host) throw new UrlGuardError("Missing hostname");

  if (isBlockedHost(host)) {
    throw new UrlGuardError(`Hostname is blocked: ${host}`);
  }

  // If host is already a literal IP, validate directly.
  const family = isIP(host);
  if (family === 4) {
    if (isPrivateV4(host)) {
      throw new UrlGuardError(`Private IPv4 address: ${host}`);
    }
    return [host];
  }
  if (family === 6) {
    if (isPrivateV6(host)) {
      throw new UrlGuardError(`Private IPv6 address: ${host}`);
    }
    return [host];
  }

  // DNS resolution: reject if any answer is private (TOCTOU window remains
  // but greatly narrows attack surface vs no check).
  let answers: { address: string; family: number }[];
  try {
    answers = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new UrlGuardError(`DNS lookup failed for ${host}`);
  }

  if (answers.length === 0) {
    throw new UrlGuardError(`No DNS answer for ${host}`);
  }

  for (const a of answers) {
    if (a.family === 4 && isPrivateV4(a.address)) {
      throw new UrlGuardError(
        `${host} resolved to private IPv4 ${a.address}`,
      );
    }
    if (a.family === 6 && isPrivateV6(a.address)) {
      throw new UrlGuardError(
        `${host} resolved to private IPv6 ${a.address}`,
      );
    }
  }

  return answers.map((a) => a.address);
}

/**
 * fetch() variant that re-validates the final URL after redirects.
 * Disables automatic redirect following so each hop can be checked.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit & { maxRedirects?: number } = {},
): Promise<Response> {
  const { maxRedirects = 5, ...rest } = init;

  let currentUrl = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    await assertSafeRemoteUrl(currentUrl);

    const response = await fetch(currentUrl, {
      ...rest,
      redirect: "manual",
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return response;
      // Resolve relative redirects against the current URL
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return response;
  }
  throw new UrlGuardError(`Too many redirects (>${maxRedirects})`);
}
