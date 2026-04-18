import type { RequestHandler } from "express";
import { getSessionTokenFromCookie } from "../auth/sessionCookie";
import { verifySessionToken } from "../auth/sessionJwt";

export interface AuthedUser {
  sub: string;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

function extractBearerToken(req: { headers: { authorization?: string } }): string | null {
  const raw = req.headers.authorization;
  if (!raw || typeof raw !== "string") return null;
  const m = /^Bearer\s+(.+)$/i.exec(raw.trim());
  return m?.[1]?.trim() || null;
}

/**
 * Require a valid server-issued session JWT: Authorization Bearer and/or HttpOnly cookie
 * set by POST /api/auth/session (so same-origin browser requests work without manual headers).
 */
export const requireUser: RequestHandler = async (req, res, next) => {
  if (req.method === "OPTIONS") {
    next();
    return;
  }

  const token = extractBearerToken(req) ?? getSessionTokenFromCookie(req);
  if (!token) {
    res.status(401).json({
      error: "Unauthorized",
      message:
        "Missing session: sign in via the app (sets a cookie), or send Authorization: Bearer <token from POST /api/auth/session>.",
    });
    return;
  }

  try {
    const session = await verifySessionToken(token);
    req.user = { sub: session.sub, email: session.email };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid or expired session token" });
  }
};
