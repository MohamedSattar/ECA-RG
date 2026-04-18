import type { CorsOptions } from "cors";

/**
 * When `CORS_ORIGINS` is unset, reflect request origin (works for local dev and same-origin).
 * When set (comma-separated), only those origins may use credentialed API calls.
 *
 * Example: `CORS_ORIGINS=https://app.example.com,https://www.example.com`
 */
export function buildCorsOptions(): CorsOptions {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) {
    return { origin: true, credentials: true };
  }

  const allowList = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    credentials: true,
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (allowList.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked for origin: ${origin}`));
    },
  };
}
