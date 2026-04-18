/**
 * Server-side auth environment (B2C id_token verification + session JWT signing).
 *
 * Supports common names from a single .env:
 * - Issuer: `B2C_ISSUER` or `B2C_AUTHORITY` or `VITE_B2C_AUTHORITY` (must match id_token `iss`)
 * - SPA client id: `B2C_CLIENT_ID` or `VITE_B2C_CLIENT_ID`
 * - Session signing: `SESSION_SECRET` or `SESSION_HMAC_SECRET`
 *
 * Note: `VITE_*` values are compiled into the SPA; they are public — never put secrets there.
 */

export const B2C_ISSUER =
  process.env.B2C_ISSUER?.trim() ||
  process.env.B2C_AUTHORITY?.trim() ||
  process.env.VITE_B2C_AUTHORITY?.trim() ||
  "";

export const B2C_CLIENT_ID =
  process.env.B2C_CLIENT_ID?.trim() ||
  process.env.VITE_B2C_CLIENT_ID?.trim() ||
  "";

export const SESSION_SECRET =
  process.env.SESSION_SECRET?.trim() ||
  process.env.SESSION_HMAC_SECRET?.trim() ||
  "";
export const SESSION_TTL_SECONDS = Math.max(
  60,
  Number(process.env.SESSION_TTL_SECONDS) || 3600,
);

/** When true (non-production only), allow VERIFICATION_TOKEN_FALLBACK for /api/verification-token. */
export const ALLOW_VERIFICATION_TOKEN_FALLBACK =
  process.env.ALLOW_VERIFICATION_TOKEN_FALLBACK === "true";

/** Never use in production — set only in local .env for dev. */
export function getVerificationTokenFallback(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  if (!ALLOW_VERIFICATION_TOKEN_FALLBACK) return null;
  const t = process.env.VERIFICATION_TOKEN_FALLBACK?.trim();
  return t && t.length > 0 ? t : null;
}

/**
 * Optional origin or full URL for `/_layout/tokenhtml`.
 * Use your Power Pages site base URL if different from DATAVERSE_BASE_URL — CRM org URLs
 * often do not return a parseable antiforgery token to anonymous server-side fetches.
 */
export const TOKENHTML_BASE_URL =
  process.env.TOKENHTML_BASE_URL?.trim() ||
  process.env.POWER_PAGES_URL?.trim() ||
  process.env.VITE_POWER_PAGES_URL?.trim() ||
  "";

export function assertSessionEnv(): void {
  if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set (at least 32 characters) for session JWT signing",
    );
  }
}

export function assertB2cEnv(): void {
  if (!B2C_ISSUER || !B2C_CLIENT_ID) {
    throw new Error(
      "B2C_ISSUER and B2C_CLIENT_ID must be set for id_token verification",
    );
  }
}
