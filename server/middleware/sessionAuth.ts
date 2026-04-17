import type { RequestHandler } from "express";
import type { SessionClaims } from "../auth/sessionJwt";
import { verifySessionToken } from "../auth/sessionJwt";
import { getSessionHmacSecret } from "../sessionSecret";

declare global {
  namespace Express {
    interface Request {
      sessionClaims?: SessionClaims | null;
    }
  }
}

export const loadSession: RequestHandler = (req, _res, next) => {
  const secret = getSessionHmacSecret();
  const raw = req.headers["x-session-token"];
  if (typeof raw === "string" && secret) {
    req.sessionClaims = verifySessionToken(raw, secret);
  } else {
    req.sessionClaims = null;
  }
  next();
};

/** Budget and other APIs that require a resolved Dataverse contact */
export const requireContactSession: RequestHandler = (req, res, next) => {
  const cid = req.sessionClaims?.contactId;
  if (!cid) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
};
