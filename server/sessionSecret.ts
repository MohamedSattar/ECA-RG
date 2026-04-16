/**
 * HMAC secret for session JWTs. Set SESSION_HMAC_SECRET in all production deployments.
 *
 * When unset, a fixed dev-only default is used so the Vite+Express dev server works even if
 * only VITE_* vars are loaded (standard `.env` / `.env.local`) and server-only keys are missing.
 */
export function getSessionHmacSecret(): string | null {
  const fromEnv = process.env.SESSION_HMAC_SECRET?.trim();
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  return "eca-rg-dev-session-hmac-placeholder-not-for-production";
}
