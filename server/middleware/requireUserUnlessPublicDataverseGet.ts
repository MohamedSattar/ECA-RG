import type { RequestHandler } from "express";
import { isPublicDataverseApiRead } from "../auth/publicDataverse";
import { requireUser } from "./requireUser";

/**
 * Session JWT required except for GET/HEAD on allowlisted /_api/<entitySet> paths
 * (see server/auth/publicDataverse.ts and PUBLIC_DATAVERSE_ENTITY_SETS).
 */
export const requireUserUnlessPublicDataverseGet: RequestHandler = (req, res, next) => {
  if (req.method === "OPTIONS") {
    next();
    return;
  }
  if (isPublicDataverseApiRead(req)) {
    next();
    return;
  }
  return requireUser(req, res, next);
};
