// src/lib/calendar/crypto.ts — AES-256-GCM token encryption (extracted from google.ts)

import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;

function getEncryptionKey(): Buffer {
  const key = process.env.CALENDAR_TOKEN_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("CALENDAR_TOKEN_ENCRYPTION_KEY is not set");
  }
  // Key must be 32 bytes for AES-256
  return Buffer.from(key, "hex");
}

/** AES-256-GCM でトークンを暗号化 */
export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  // iv:tag:encrypted の形式で保存
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/** AES-256-GCM でトークンを復号 */
export function decryptToken(encrypted: string): string {
  const key = getEncryptionKey();
  const [ivHex, tagHex, encryptedText] = encrypted.split(":");
  if (!ivHex || !tagHex || !encryptedText) {
    throw new Error("不正な暗号化トークン形式です");
  }

  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
