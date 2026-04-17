import type { RequestHandler } from "express";
import { emailFromClaims, verifyB2cIdToken } from "../auth/b2cIdToken";
import { lookupContactIdByEmail } from "../auth/contactLookup";
import { signSessionToken } from "../auth/sessionJwt";
import { getSessionHmacSecret } from "../sessionSecret";

const B2C_AUTHORITY =
  process.env.B2C_AUTHORITY || process.env.VITE_B2C_AUTHORITY || "";
const B2C_CLIENT_ID =
  process.env.B2C_CLIENT_ID || process.env.VITE_B2C_CLIENT_ID || "";

export const handleAuthSession: RequestHandler = async (req, res) => {
  try {
    const sessionSecret = getSessionHmacSecret();
    if (!sessionSecret) {
      return res.status(503).json({ error: "Session signing is not configured. Set SESSION_HMAC_SECRET." });
    }
    if (!B2C_AUTHORITY || !B2C_CLIENT_ID) {
      return res.status(503).json({ error: "B2C authority or client id is not configured" });
    }

    const idToken = (req.body as { idToken?: string })?.idToken;
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "idToken required" });
    }

    const claims = await verifyB2cIdToken(idToken, {
      authority: B2C_AUTHORITY,
      expectedAudience: B2C_CLIENT_ID,
    });
    const email = emailFromClaims(claims);
    let contactId: string | null = null;
    try {
      contactId = await lookupContactIdByEmail(email);
    } catch (e) {
      console.warn("[AuthSession] Contact lookup failed:", e);
    }

    const sessionToken = signSessionToken(
      {
        email,
        contactId,
        sub: claims.sub,
      },
      sessionSecret,
    );

    return res.json({ sessionToken, contactId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[AuthSession]", msg);
    return res.status(401).json({ error: "Invalid id_token", details: msg });
  }
};
