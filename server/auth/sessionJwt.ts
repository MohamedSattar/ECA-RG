/**
 * Short-lived HMAC-SHA256 session JWT for Dataverse proxy authorization.
 */

import { createHmac, timingSafeEqual } from "crypto";

export type SessionClaims = {
  email: string;
  contactId: string | null;
  sub: string;
  iat: number;
  exp: number;
};

function base64Url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlEncodeJson(obj: unknown): string {
  return base64Url(Buffer.from(JSON.stringify(obj), "utf8"));
}

function base64UrlDecodeToString(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64").toString(
    "utf8",
  );
}

export function signSessionToken(
  claims: Omit<SessionClaims, "iat" | "exp">,
  secret: string,
  ttlSeconds = 60 * 60 * 8,
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload: SessionClaims = {
    ...claims,
    iat: now,
    exp: now + ttlSeconds,
  };
  const h = base64UrlEncodeJson(header);
  const p = base64UrlEncodeJson(payload);
  const sig = createHmac("sha256", secret).update(`${h}.${p}`).digest();
  const s = base64Url(sig);
  return `${h}.${p}.${s}`;
}

function b64UrlToBuf(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

export function verifySessionToken(token: string, secret: string): SessionClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [h, p, s] = parts;
    const expected = createHmac("sha256", secret).update(`${h}.${p}`).digest();
    const got = b64UrlToBuf(s);
    if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
    const payload = JSON.parse(base64UrlDecodeToString(p)) as SessionClaims;
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now - 60) return null;
    if (!payload.email || !payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}
