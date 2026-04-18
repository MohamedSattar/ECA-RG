import type { RequestHandler } from "express";
import { assertB2cEnv, assertSessionEnv } from "../auth/env";
import { clearSessionCookie, setSessionCookie } from "../auth/sessionCookie";
import { verifyB2cIdToken } from "../auth/verifyB2cIdToken";
import { signSessionToken } from "../auth/sessionJwt";

/**
 * POST /api/auth/session
 * Body: { idToken: string } — B2C id_token from MSAL.
 * Returns: { sessionToken: string } — server-signed JWT for subsequent API calls.
 */
export const handleAuthSession: RequestHandler = async (req, res) => {
  try {
    assertB2cEnv();
    assertSessionEnv();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(503).json({ error: "Auth not configured", message: msg });
  }

  const idToken =
    typeof req.body?.idToken === "string" ? req.body.idToken.trim() : "";
  if (!idToken) {
    return res.status(400).json({ error: "idToken required" });
  }

  try {
    const { sub, email } = await verifyB2cIdToken(idToken);
    const sessionToken = await signSessionToken({ sub, email });
    setSessionCookie(res, sessionToken);
    return res.json({ sessionToken });
  } catch (err: unknown) {
    return res.status(401).json({ error: "Invalid id_token" });
  }
};

/** Clears the HttpOnly session cookie (call on logout; idempotent). */
export const handleAuthLogout: RequestHandler = (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
};
