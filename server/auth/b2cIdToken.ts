/**
 * Verify Azure AD B2C id_token (RS256) using OIDC discovery + JWKS.
 * No external JWT libraries — Node crypto only.
 */

import { createPublicKey, createVerify } from "crypto";

let cachedOidc: { jwks_uri: string; issuer: string } | null = null;
let cachedJwks: { keys: Record<string, unknown>[] } | null = null;
let cachedJwksUrl: string | null = null;

function base64UrlToString(s: string): string {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64").toString(
    "utf8",
  );
}

function base64UrlToBuffer(s: string): Buffer {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/") + pad, "base64");
}

async function fetchJson<T>(url: string): Promise<T> {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`HTTP ${r.status} fetching ${url}`);
  return r.json() as Promise<T>;
}

async function getOidc(authorityBase: string): Promise<{ jwks_uri: string; issuer: string }> {
  const base = authorityBase.endsWith("/") ? authorityBase.slice(0, -1) : authorityBase;
  const wellKnown = `${base}/.well-known/openid-configuration`;
  if (cachedOidc) return cachedOidc;
  const doc = await fetchJson<{ jwks_uri: string; issuer: string }>(wellKnown);
  cachedOidc = { jwks_uri: doc.jwks_uri, issuer: doc.issuer };
  return cachedOidc;
}

async function getJwks(jwksUri: string): Promise<Record<string, unknown>[]> {
  if (cachedJwks && cachedJwksUrl === jwksUri) return cachedJwks.keys;
  const doc = await fetchJson<{ keys: Record<string, unknown>[] }>(jwksUri);
  cachedJwks = doc;
  cachedJwksUrl = jwksUri;
  return doc.keys;
}

export type VerifiedIdTokenClaims = {
  sub: string;
  email?: string;
  emails?: string[];
  aud?: string | string[];
  iss: string;
  exp: number;
};

export async function verifyB2cIdToken(
  idToken: string,
  options: { authority: string; expectedAudience: string },
): Promise<VerifiedIdTokenClaims> {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Invalid id_token format");

  const headerJson = base64UrlToString(parts[0]);
  const payloadJson = base64UrlToString(parts[1]);
  const header = JSON.parse(headerJson) as { alg?: string; kid?: string; typ?: string };
  if (header.alg !== "RS256") throw new Error(`Unexpected alg ${header.alg}`);
  if (!header.kid) throw new Error("Missing kid in id_token header");

  const payload = JSON.parse(payloadJson) as VerifiedIdTokenClaims;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || payload.exp < now - 120) {
    throw new Error("id_token expired");
  }

  const { jwks_uri, issuer } = await getOidc(options.authority);
  if (payload.iss !== issuer) {
    throw new Error("id_token issuer mismatch");
  }

  const aud = payload.aud;
  const audList = Array.isArray(aud) ? aud : aud ? [aud] : [];
  if (!audList.includes(options.expectedAudience)) {
    throw new Error("id_token audience mismatch");
  }

  const keys = await getJwks(jwks_uri);
  const jwk = keys.find((k) => (k as { kid?: string }).kid === header.kid);
  if (!jwk) throw new Error("Signing key not found in JWKS");

  const key = createPublicKey({ key: jwk, format: "jwk" });
  const msg = `${parts[0]}.${parts[1]}`;
  const sig = base64UrlToBuffer(parts[2]);
  const verifier = createVerify("RSA-SHA256");
  verifier.update(msg);
  verifier.end();
  const ok = verifier.verify(key, sig);
  if (!ok) throw new Error("id_token signature invalid");

  return payload;
}

export function emailFromClaims(c: VerifiedIdTokenClaims): string {
  const e =
    c.email ||
    (Array.isArray(c.emails) && c.emails.length > 0 ? c.emails[0] : undefined);
  if (!e || typeof e !== "string") throw new Error("No email claim in id_token");
  return e.trim().toLowerCase();
}
