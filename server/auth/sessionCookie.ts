import type { Request, Response } from "express";
import { SESSION_TTL_SECONDS } from "./env";

/** HttpOnly cookie holding the same JWT as localStorage `auth.sessionToken` (SPA still sends Bearer). */
export const SESSION_COOKIE_NAME = "eca_session";

export function setSessionCookie(res: Response, sessionToken: string): void {
  res.cookie(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
}

export function getSessionTokenFromCookie(req: Request): string | null {
  const raw = req.headers.cookie;
  if (!raw || typeof raw !== "string") return null;
  for (const part of raw.split(";")) {
    const s = part.trim();
    const i = s.indexOf("=");
    if (i === -1) continue;
    const name = s.slice(0, i);
    const value = s.slice(i + 1);
    if (name === SESSION_COOKIE_NAME && value.length > 0) {
      try {
        return decodeURIComponent(value);
      } catch {
        return value;
      }
    }
  }
  return null;
}
