import { SignJWT, jwtVerify } from "jose";
import { SESSION_SECRET, SESSION_TTL_SECONDS } from "./env";

const encoder = new TextEncoder();

function getSecretKey() {
  return encoder.encode(SESSION_SECRET);
}

export interface SessionClaims {
  sub: string;
  email?: string;
}

export interface VerifiedSession extends SessionClaims {
  iat?: number;
  exp?: number;
}

/**
 * Issue a short-lived HS256 JWT for authenticated API calls (Authorization: Bearer).
 */
export async function signSessionToken(claims: SessionClaims): Promise<string> {
  const jwt = await new SignJWT({
    sub: claims.sub,
    ...(claims.email ? { email: claims.email } : {}),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecretKey());

  return jwt;
}

export async function verifySessionToken(token: string): Promise<VerifiedSession> {
  const { payload } = await jwtVerify(token, getSecretKey(), {
    algorithms: ["HS256"],
  });

  const sub = typeof payload.sub === "string" ? payload.sub : "";
  if (!sub) {
    throw new Error("Session token missing sub");
  }

  const email = typeof payload.email === "string" ? payload.email : undefined;

  return {
    sub,
    email,
    iat: typeof payload.iat === "number" ? payload.iat : undefined,
    exp: typeof payload.exp === "number" ? payload.exp : undefined,
  };
}
