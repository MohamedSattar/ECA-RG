import type express from "express";
import { getDataverseToken } from "../dataverseClient";
import { verifySessionToken, type SessionClaims } from "../auth/sessionJwt";
import {
  PUBLIC_ENTITY_SETS,
  parseUnderscoreApiPath,
  mergeMandatoryFilter,
  rowFilterForEntity,
  sanitizeODataFilterBeforeMerge,
  extractBudgetSpendLineItemGuidFromFilter,
  type RowFilterResult,
} from "./dataversePolicy";
import { assertCanAccessPrivateRecord } from "./ownershipPreflight";
import { budgetLineItemOwnedByContact } from "../budgetOwnership";
import { getSessionHmacSecret } from "../sessionSecret";
const DATAVERSE_BASE_URL =
  process.env.DATAVERSE_BASE_URL ||
  (process.env.DATAVERSE_RESOURCE
    ? process.env.DATAVERSE_RESOURCE.replace(/\/\.default\/?$/, "")
    : "https://eca.crm15.dynamics.com");
const FORCE_FORWARD_CLIENT_AUTH = process.env.FORWARD_CLIENT_AUTH === "true";

const PUBLIC_MAX_TOP = 500;

function getSession(req: express.Request, secret: string | null): SessionClaims | null {
  const raw = req.headers["x-session-token"];
  if (!raw || typeof raw !== "string" || !secret) return null;
  return verifySessionToken(raw, secret);
}

function deny(res: express.Response, status: number, msg: string) {
  res.status(status).json({ error: msg });
}

function targetPathFromReq(apiPath: string): string {
  if (apiPath.startsWith("/_api/")) {
    return apiPath.replace(/^\/_api\//, "/api/data/v9.2/");
  }
  return apiPath;
}

/** POST body checks for private merged entity sets */
function assertSafePrivateMutationBody(
  entitySetLc: string,
  method: string,
  session: SessionClaims,
  body: unknown,
): string | null {
  if (method !== "POST" || typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  if (entitySetLc === "contacts") {
    const em =
      (typeof b.emailaddress1 === "string" && b.emailaddress1) ||
      (typeof b.EmailAddress1 === "string" && b.EmailAddress1);
    if (!em || em.trim().toLowerCase() !== session.email.trim().toLowerCase()) {
      return "Contact create must use the signed-in user's email";
    }
  }

  if (entitySetLc === "prmtk_applications") {
    const cid = session.contactId;
    if (!cid) return "Missing contact for application create";
    const bind = b["prmtk_MainApplicant@odata.bind"];
    if (typeof bind !== "string") return "Application create must bind main applicant";
    const guid = cid.replace(/[{}]/g, "").toLowerCase();
    if (!bind.toLowerCase().includes(guid)) {
      return "Application main applicant must be the signed-in contact";
    }
  }

  return null;
}

async function assertBudgetSpendCreateAllowed(
  session: SessionClaims,
  body: unknown,
): Promise<string | null> {
  if (typeof body !== "object" || body === null) return "Invalid body";
  const b = body as Record<string, unknown>;
  const bind =
    (typeof b["prmtk_LineItem@odata.bind"] === "string" && b["prmtk_LineItem@odata.bind"]) ||
    (typeof b["prmtk_BudgetLineItem@odata.bind"] === "string" &&
      b["prmtk_BudgetLineItem@odata.bind"]);
  if (typeof bind !== "string" || !bind.trim()) {
    return "Budget spend create must bind a line item (prmtk_LineItem@odata.bind)";
  }
  const m = bind.match(/prmtk_budgetlineitems\(([0-9a-fA-F-]{36})\)/i);
  if (!m) return "Invalid line item binding URL";
  const guid = m[1];
  const cid = session.contactId;
  if (!cid) return "Missing contact for budget spend create";
  const ok = await budgetLineItemOwnedByContact(guid, cid);
  if (!ok) return "Forbidden";
  return null;
}

export async function runDataverseProxy(
  req: express.Request,
  res: express.Response,
): Promise<void> {
  try {
    const apiPath = req.path;
    const sessionSecret = getSessionHmacSecret();
    const session = getSession(req, sessionSecret);
    const parsed = parseUnderscoreApiPath(apiPath);

    const isPublic =
      parsed &&
      PUBLIC_ENTITY_SETS.has(parsed.entitySetLc) &&
      (req.method === "GET" || req.method === "HEAD");

    const needsSession = !isPublic;

    if (needsSession && !sessionSecret) {
      return deny(
        res,
        503,
        "Session signing is not configured. Set SESSION_HMAC_SECRET on the server.",
      );
    }

    if (needsSession && !session) {
      return deny(res, 401, "Authentication required");
    }

    if (parsed && PUBLIC_ENTITY_SETS.has(parsed.entitySetLc)) {
      if (req.method !== "GET" && req.method !== "HEAD") {
        return deny(res, 403, "Method not allowed on public entity set");
      }
    }

    let rowFilter: RowFilterResult | null = null;
    if (parsed && needsSession && session) {
      rowFilter = rowFilterForEntity(parsed.entitySetLc, session);
      if (rowFilter.kind === "deny") {
        return deny(
          res,
          403,
          "This resource is not available through the API proxy.",
        );
      }
    }

    let targetPath = targetPathFromReq(apiPath);
    const fullUrl = new URL(DATAVERSE_BASE_URL + targetPath);

    if (req.url.includes("?")) {
      const queryPart = req.url.substring(req.url.indexOf("?"));
      fullUrl.search = queryPart;
    }

    if (isPublic) {
      const top = fullUrl.searchParams.get("$top");
      if (top && Number(top) > PUBLIC_MAX_TOP) {
        fullUrl.searchParams.set("$top", String(PUBLIC_MAX_TOP));
      }
    }

    if (
      parsed &&
      session &&
      (rowFilter?.kind === "merge" || rowFilter?.kind === "budget_spends_scoped") &&
      parsed.recordId &&
      (req.method === "GET" || req.method === "HEAD")
    ) {
      const ok = await assertCanAccessPrivateRecord(
        parsed.entitySet,
        parsed.entitySetLc,
        parsed.recordId,
        session,
      );
      if (!ok) {
        return deny(res, 404, "Not found");
      }
    }

    if (parsed && session && rowFilter?.kind === "merge") {
      const mandatory = rowFilter.mandatory;

      if (req.method === "GET" && !parsed.recordId) {
        const existingRaw = fullUrl.searchParams.get("$filter") || undefined;
        const existing = sanitizeODataFilterBeforeMerge(existingRaw);
        const merged = mergeMandatoryFilter(existing, mandatory);
        fullUrl.searchParams.set("$filter", merged);
      } else if (
        (req.method === "PATCH" ||
          req.method === "DELETE" ||
          req.method === "PUT" ||
          req.method === "MERGE") &&
        parsed.recordId
      ) {
        const ok = await assertCanAccessPrivateRecord(
          parsed.entitySet,
          parsed.entitySetLc,
          parsed.recordId,
          session,
        );
        if (!ok) {
          return deny(res, 404, "Not found");
        }
      } else if (req.method === "POST") {
        const err = assertSafePrivateMutationBody(
          parsed.entitySetLc,
          req.method,
          session,
          req.body,
        );
        if (err) {
          return deny(res, 403, err);
        }
      }
    } else if (parsed && session && rowFilter?.kind === "budget_spends_scoped") {
      if ((req.method === "GET" || req.method === "HEAD") && !parsed.recordId) {
        const existingRaw = fullUrl.searchParams.get("$filter") || undefined;
        const existing = sanitizeODataFilterBeforeMerge(existingRaw);
        if (!existing) {
          return deny(
            res,
            400,
            "prmtk_budgetspends requires $filter including _prmtk_lineitem_value eq <budget line item id>",
          );
        }
        const li = extractBudgetSpendLineItemGuidFromFilter(existing);
        if (li.kind === "none") {
          return deny(
            res,
            400,
            "prmtk_budgetspends queries must filter by _prmtk_lineitem_value eq <guid>.",
          );
        }
        if (li.kind === "ambiguous") {
          return deny(
            res,
            400,
            "prmtk_budgetspends filter must not reference multiple different line items.",
          );
        }
        const cid = session.contactId;
        if (!cid) {
          return deny(res, 403, "Missing contact for budget spend query");
        }
        const allowed = await budgetLineItemOwnedByContact(li.guid, cid);
        if (!allowed) {
          return deny(res, 404, "Not found");
        }
        fullUrl.searchParams.set("$filter", existing);
      } else if (
        (req.method === "PATCH" ||
          req.method === "DELETE" ||
          req.method === "PUT" ||
          req.method === "MERGE") &&
        parsed.recordId
      ) {
        const ok = await assertCanAccessPrivateRecord(
          parsed.entitySet,
          parsed.entitySetLc,
          parsed.recordId,
          session,
        );
        if (!ok) {
          return deny(res, 404, "Not found");
        }
      } else if (req.method === "POST") {
        const err = await assertBudgetSpendCreateAllowed(session, req.body);
        if (err) {
          return deny(res, 403, err);
        }
      }
    }

    const fetchHeaders: HeadersInit = {
      Accept: "application/json",
      "OData-Version": "4.0",
      "OData-MaxVersion": "4.0",
      "If-None-Match": "null",
    };

    const serverToken = await getDataverseToken();
    if (serverToken) {
      fetchHeaders["Authorization"] = `Bearer ${serverToken}`;
    } else if (FORCE_FORWARD_CLIENT_AUTH && req.headers.authorization) {
      fetchHeaders["Authorization"] = String(req.headers.authorization);
    } else if (!serverToken) {
      return deny(res, 503, "Server-side Dataverse token unavailable");
    }

    if (req.headers["content-type"]) {
      fetchHeaders["Content-Type"] = String(req.headers["content-type"]);
    }

    let body: string | undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = JSON.stringify(req.body);
    }

    const response = await fetch(fullUrl.toString(), {
      method: req.method,
      headers: fetchHeaders,
      body,
      credentials: "include",
    });

    const contentType = response.headers.get("content-type");
    let data: unknown;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else if (contentType?.includes("application/octet-stream")) {
      data = await response.arrayBuffer();
    } else {
      data = await response.text();
    }

    res.status(response.status);

    if (response.headers.get("content-type")) {
      res.setHeader("Content-Type", response.headers.get("content-type")!);
    }
    if (response.headers.get("odata-entityid")) {
      res.setHeader("OData-EntityId", response.headers.get("odata-entityid")!);
    }
    if (response.headers.get("odata-version")) {
      res.setHeader("OData-Version", response.headers.get("odata-version")!);
    }

    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (contentType?.includes("application/json")) {
      res.json(data);
    } else if (contentType?.includes("application/octet-stream")) {
      res.end(Buffer.from(data as ArrayBuffer));
    } else {
      res.send(data as string);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const isProd = process.env.NODE_ENV === "production";
    res.status(502).json(
      isProd
        ? { error: "Proxy error" }
        : {
            error: "Proxy error",
            details: msg,
            target: DATAVERSE_BASE_URL + req.path,
          },
    );
  }
}
