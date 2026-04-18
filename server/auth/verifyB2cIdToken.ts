import { createRemoteJWKSet, jwtVerify } from "jose";
import { B2C_CLIENT_ID, B2C_ISSUER } from "./env";

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

/** B2C issuer ends with `/v2.0/`; JWKS is `{policyBase}/discovery/v2.0/keys`. */
export function b2cJwksUriFromIssuer(issuer: string): string {
  const trimmed = issuer.trim();
  const base = trimmed.replace(/\/?v2\.0\/?$/i, "");
  return `${base.replace(/\/$/, "")}/discovery/v2.0/keys`;
}

function getJwks() {
  if (!jwks) {
    const jwksUrl = b2cJwksUriFromIssuer(B2C_ISSUER);
    jwks = createRemoteJWKSet(new URL(jwksUrl));
  }
  return jwks;
}

export interface B2cIdTokenClaims {
  sub: string;
  email?: string;
}

/**
 * Verify an Azure AD B2C id_token (SPA) against the policy JWKS.
 */
export async function verifyB2cIdToken(idToken: string): Promise<B2cIdTokenClaims> {
  const issuer =
    B2C_ISSUER.endsWith("/") ? B2C_ISSUER : `${B2C_ISSUER}/`;

  const { payload } = await jwtVerify(idToken, getJwks(), {
    issuer,
    audience: B2C_CLIENT_ID,
  });

  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) {
    throw new Error("id_token missing sub");
  }

  const email =
    typeof payload.email === "string"
      ? payload.email
      : typeof payload.preferred_username === "string"
        ? payload.preferred_username
        : undefined;

  return { sub, email };
}
