import rateLimit from "express-rate-limit";

/** Session exchange — limit abuse of B2C id_token posts. */
export const authSessionRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AUTH_SESSION_MAX) || 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many session requests", message: "Try again later" },
});

/** Verification HTML fetch — moderate; tied to authenticated users. */
export const verificationTokenRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_VERIFICATION_TOKEN_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests", message: "Try again later" },
});
