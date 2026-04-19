import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";

function parsePositiveInt(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Global HTTP rate limit for the Express app.
 *
 * Env:
 * - RATE_LIMIT_ENABLED — set to "false" to disable (e.g. local dev only).
 * - RATE_LIMIT_WINDOW_MS — sliding window length in ms (default 60000).
 * - RATE_LIMIT_MAX — max requests per IP per window (default 200).
 * - RATE_LIMIT_SKIP_HEALTH — if not "false", GET /health does not count (default: skip health).
 */
export function rateLimiterMiddleware(): RequestHandler {
  if (process.env.RATE_LIMIT_ENABLED === "false") {
    return (_req, _res, next) => next();
  }

  const windowMs = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
  const max = parsePositiveInt(process.env.RATE_LIMIT_MAX, 200);
  const skipHealth = process.env.RATE_LIMIT_SKIP_HEALTH !== "false";

  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => skipHealth && req.method === "GET" && req.path === "/health",
  });
}
