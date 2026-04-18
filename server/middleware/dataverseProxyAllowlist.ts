import type { RequestHandler } from "express";
import { isPublicDataverseApiRead } from "../auth/publicDataverse";
import { isAuthenticatedDataverseProxyPathAllowed } from "../auth/dataverseEntityAllowlist";

/**
 * Rejects proxy targets not on the authenticated entity/layout allowlist.
 * Public GET/HEAD for {@link isPublicDataverseApiRead} must still be allowlisted (same sets).
 */
export const dataverseProxyAllowlist: RequestHandler = (req, res, next) => {
  if (isPublicDataverseApiRead(req)) {
    if (!isAuthenticatedDataverseProxyPathAllowed(req.path || "")) {
      res
        .status(403)
        .json({
          error: "Forbidden",
          message: "Dataverse path is not allowlisted",
        });
      return;
    }
    next();
    return;
  }

  if (!isAuthenticatedDataverseProxyPathAllowed(req.path || "")) {
    res
      .status(403)
      .json({
        error: "Forbidden",
        message: "Dataverse path is not allowlisted",
      });
    return;
  }
  next();
};
