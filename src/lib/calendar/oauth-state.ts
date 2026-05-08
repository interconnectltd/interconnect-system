/**
 * OAuth state パラメータ署名・検証
 *
 * OAuth 認可フローで CSRF / アカウント乗っ取り攻撃を防ぐため、
 * state を HMAC-SHA256 で署名する。
 *
 * 形式: base64url(JSON({userId, nonce, exp})) + "." + hmac-sha256(payload, secret)
 *
 * - exp は now + 10 分
 * - nonce はランダム 16 byte (再使用検知ではなく state 値そのものに entropy を持たせるため)
 * - secret は CALENDAR_FEED_SECRET を流用
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const ALGORITHM = "sha256";
const STATE_TTL_MS = 10 * 60 * 1000; // 10 分

interface StatePayload {
  userId: string;
  nonce: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.CALENDAR_FEED_SECRET;
  if (!secret) {
    throw new Error("CALENDAR_FEED_SECRET environment variable is not set");
  }
  return secret;
}

function base64urlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecodeToString(encoded: string): string {
  const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf-8");
}

function computeHmac(payload: string, secret: string): string {
  return createHmac(ALGORITHM, secret).update(payload).digest("hex");
}

function isStatePayload(value: unknown): value is StatePayload {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.userId === "string" &&
    typeof v.nonce === "string" &&
    typeof v.exp === "number"
  );
}

/**
 * userId から HMAC 署名された state 文字列を生成する
 * @param userId 認証セッションから取得した user.id
 * @returns OAuth URL に埋め込む state 値
 */
export function signOAuthState(userId: string): string {
  if (!userId) {
    throw new Error("userId is required");
  }
  const secret = getSecret();
  const payload: StatePayload = {
    userId,
    nonce: randomBytes(16).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
  };
  const json = JSON.stringify(payload);
  const encodedPayload = base64urlEncode(Buffer.from(json, "utf-8"));
  const hmac = computeHmac(encodedPayload, secret);
  return `${encodedPayload}.${hmac}`;
}

/**
 * state 文字列を検証し、userId を返す
 * - HMAC 不一致 / 期限切れ / 形式不正は全て null
 *
 * @returns 検証成功時 { userId }、失敗時 null
 */
export function verifyOAuthState(state: string): { userId: string } | null {
  try {
    if (typeof state !== "string" || state.length === 0) return null;

    const dotIndex = state.indexOf(".");
    if (dotIndex === -1) return null;

    const encodedPayload = state.substring(0, dotIndex);
    const providedHmac = state.substring(dotIndex + 1);
    if (!encodedPayload || !providedHmac) return null;

    const secret = getSecret();
    const expectedHmac = computeHmac(encodedPayload, secret);

    // Timing-safe comparison
    if (providedHmac.length !== expectedHmac.length) return null;
    const a = Buffer.from(providedHmac, "utf-8");
    const b = Buffer.from(expectedHmac, "utf-8");
    if (!timingSafeEqual(a, b)) return null;

    const json = base64urlDecodeToString(encodedPayload);
    if (!json) return null;

    const parsed: unknown = JSON.parse(json);
    if (!isStatePayload(parsed)) return null;

    if (!Number.isFinite(parsed.exp) || Date.now() > parsed.exp) return null;
    if (!parsed.userId) return null;

    return { userId: parsed.userId };
  } catch {
    return null;
  }
}
