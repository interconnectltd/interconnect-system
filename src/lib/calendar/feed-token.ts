/**
 * カレンダーフィード用トークン生成・検証
 *
 * トークン形式: base64url(userId) + "." + hmac-sha256(userId, secret)
 * → DB検索なしで userId を抽出・検証可能
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

function computeHmac(userId: string, secret: string): string {
  return createHmac(ALGORITHM, secret).update(userId).digest("hex");
}

/**
 * ユーザーIDからフィードトークンを生成
 * @returns base64url(userId).hmac
 */
export function generateFeedToken(userId: string): string {
  const secret = getSecret();
  const encodedId = base64urlEncode(userId);
  const hmac = computeHmac(userId, secret);
  return `${encodedId}.${hmac}`;
}

/**
 * フィードトークンを検証し、ユーザーIDを返す
 * @returns userId if valid, null otherwise
 */
export function validateFeedToken(token: string): string | null {
  try {
    const dotIndex = token.indexOf(".");
    if (dotIndex === -1) return null;

    const encodedId = token.substring(0, dotIndex);
    const providedHmac = token.substring(dotIndex + 1);

    const userId = base64urlDecode(encodedId);
    if (!userId) return null;

    const secret = getSecret();
    const expectedHmac = computeHmac(userId, secret);

    // Timing-safe comparison to prevent timing attacks
    if (providedHmac.length !== expectedHmac.length) return null;

    const a = Buffer.from(providedHmac, "utf-8");
    const b = Buffer.from(expectedHmac, "utf-8");
    if (!timingSafeEqual(a, b)) return null;

    return userId;
  } catch {
    return null;
  }
}
