/**
 * カレンダーフィード用トークン生成・検証
 *
 * トークン形式: base64url(`${userId}:${version}`) + "." + hmac-sha256(payload, secret)
 * → DB検索なしで userId と version を抽出し、HMAC で改竄検出可能
 *
 * version はユーザー単位で user_profiles.feed_token_version に保存される。
 * 値をインクリメントすることで、そのユーザーの旧トークンのみを失効させ、
 * 他ユーザーには影響を与えずに失効処理（revocation）ができる。
 */

import { createHmac, timingSafeEqual } from "crypto";

const ALGORITHM = "sha256";

function getSecret(): string {
  const secret = process.env.CALENDAR_FEED_SECRET;
  if (!secret) {
    throw new Error("CALENDAR_FEED_SECRET environment variable is not set");
  }
  return secret;
}

/** URL-safe base64 encode */
function base64urlEncode(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** URL-safe base64 decode */
function base64urlDecode(encoded: string): string {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf-8");
}

function computeHmac(payload: string, secret: string): string {
  return createHmac(ALGORITHM, secret).update(payload).digest("hex");
}

/**
 * ユーザーIDとバージョンからフィードトークンを生成
 * @param userId 対象ユーザーID
 * @param version user_profiles.feed_token_version の値（必須）
 * @returns base64url(`${userId}:${version}`).hmac
 */
export function generateFeedToken(userId: string, version: number): string {
  const secret = getSecret();
  const payload = `${userId}:${version}`;
  const encodedPayload = base64urlEncode(payload);
  const hmac = computeHmac(payload, secret);
  return `${encodedPayload}.${hmac}`;
}

/**
 * フィードトークンを検証し、userId と version を返す
 *
 * 注意: この関数は HMAC の改竄検出のみを行う。
 * トークン内 version が DB の現行 version と一致するかは
 * 呼び出し側で確認すること（per-user revocation のため）。
 *
 * @returns { userId, version } if HMAC valid, null otherwise
 */
export function validateFeedToken(
  token: string,
): { userId: string; version: number } | null {
  try {
    const dotIndex = token.indexOf(".");
    if (dotIndex === -1) return null;

    const encodedPayload = token.substring(0, dotIndex);
    const providedHmac = token.substring(dotIndex + 1);

    const payload = base64urlDecode(encodedPayload);
    if (!payload) return null;

    const sepIndex = payload.lastIndexOf(":");
    if (sepIndex === -1) return null;

    const userId = payload.substring(0, sepIndex);
    const versionStr = payload.substring(sepIndex + 1);
    if (!userId || !versionStr) return null;

    const version = Number.parseInt(versionStr, 10);
    if (!Number.isInteger(version) || version < 1) return null;

    const secret = getSecret();
    const expectedHmac = computeHmac(payload, secret);

    // Timing-safe comparison to prevent timing attacks
    if (providedHmac.length !== expectedHmac.length) return null;

    const a = Buffer.from(providedHmac, "utf-8");
    const b = Buffer.from(expectedHmac, "utf-8");
    if (!timingSafeEqual(a, b)) return null;

    return { userId, version };
  } catch {
    return null;
  }
}
