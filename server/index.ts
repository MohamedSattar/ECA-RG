import "dotenv/config";
import crypto from "crypto";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";

// ─── Environment ─────────────────────────────────────────────────────────────
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const DATAVERSE_RESOURCE = process.env.DATAVERSE_RESOURCE;
const DATAVERSE_BASE_URL =
  process.env.DATAVERSE_BASE_URL ||
  (DATAVERSE_RESOURCE
    ? DATAVERSE_RESOURCE.replace(/\/\.default\/?$/, "")
    : "https://researchgrants-dev.powerappsportals.com");
const FORCE_FORWARD_CLIENT_AUTH = process.env.FORWARD_CLIENT_AUTH === "true";
const SESSION_SECRET = process.env.SESSION_SECRET || "";
const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000; // 8 hours

if (!SESSION_SECRET) {
  console.warn(
    "[Security] SESSION_SECRET env var is not set — session tokens are insecure in production.",
  );
}

// ─── Server Token Cache ───────────────────────────────────────────────────────
let cachedServerToken: string | null = null;
let cachedServerTokenExpiry = 0;

async function acquireServerToken(): Promise<string | null> {
  try {
    if (cachedServerToken && cachedServerTokenExpiry > Date.now()) {
      return cachedServerToken;
    }
    if (
      !AZURE_TENANT_ID ||
      !AZURE_CLIENT_ID ||
      !AZURE_CLIENT_SECRET ||
      !DATAVERSE_RESOURCE
    ) {
      console.log(
        "[ServerToken] Missing Azure credentials; skipping token acquisition",
      );
      return null;
    }
    const tokenUrl = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append("client_id", AZURE_CLIENT_ID);
    params.append("client_secret", AZURE_CLIENT_SECRET);
    params.append("grant_type", "client_credentials");
    params.append("scope", DATAVERSE_RESOURCE);

    console.log("[ServerToken] Requesting client credentials token from AAD");
    const resp = await fetch(tokenUrl, {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.error("[ServerToken] Token endpoint error:", resp.status, txt);
      return null;
    }
    const body = await resp.json();
    cachedServerToken = body.access_token;
    const expiresIn = Number(body.expires_in) || 3600;
    cachedServerTokenExpiry = Date.now() + (expiresIn - 60) * 1000;
    console.log("[ServerToken] Acquired token; expires in", expiresIn, "s");
    return cachedServerToken;
  } catch (err) {
    console.error("[ServerToken] Error acquiring token:", err);
    return null;
  }
}

// ─── Session Token (server-issued, HMAC-SHA256 signed) ───────────────────────
// The client exchanges a B2C idToken for this short-lived server token, which
// carries the verified contactId.  The proxy enforces data filters using it.

interface SessionPayload {
  contactId: string;
  email: string;
  iat: number;
  exp: number;
}

function signToken(payload: SessionPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(data)
    .digest("base64url");
  return `${data}.${sig}`;
}

function verifyToken(token: string): SessionPayload | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const data = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = crypto
      .createHmac("sha256", SESSION_SECRET)
      .update(data)
      .digest("base64url");
    // Constant-time comparison to prevent timing attacks
    if (
      sig.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    )
      return null;
    const payload = JSON.parse(
      Buffer.from(data, "base64url").toString(),
    ) as SessionPayload;
    if (payload.exp < Date.now()) return null; // expired
    return payload;
  } catch {
    return null;
  }
}

// ─── Table Ownership Config ───────────────────────────────────────────────────

interface Tier1Config {
  /** OData value field that holds the owning contact's id (or email). */
  ownerField: string;
  /** When true, compare ownerField to session.email instead of session.contactId. */
  useEmail?: boolean;
  /** Navigation property for @odata.bind injection on POST. */
  ownerBindField?: string;
}

interface Tier2Config {
  /** Primary parent lookup field present in $filter / request body. */
  parentField: string;
  /** Entity set name of the primary parent table. */
  parentTable: string;
  /** Alternative parent field (tables that can belong to either of two parents). */
  altParentField?: string;
  altParentTable?: string;
}

/**
 * Tier 1 — records owned directly by a contact.
 * For GET collections: server appends an owner filter.
 * For GET single / PATCH / DELETE: server verifies ownership before forwarding.
 * For POST: server injects the owner bind field.
 */
const TIER1_TABLES: Record<string, Tier1Config> = {
  contacts: { ownerField: "emailaddress1", useEmail: true },
  prmtk_notifications: {
    ownerField: "_prmtk_applicant_value",
    ownerBindField: "prmtk_Applicant@odata.bind",
  },
  prmtk_applications: {
    ownerField: "_prmtk_mainapplicant_value",
    ownerBindField: "prmtk_MainApplicant@odata.bind",
  },
  prmtk_researchs: {
    ownerField: "_prmtk_principalinvestigator_value",
    ownerBindField: "prmtk_PrincipalInvestigator@odata.bind",
  },
};

/**
 * Tier 2 — records owned by a parent record.
 * Server verifies the parent record's ownership via the Tier 1 chain.
 * For GET collections: parent filter must be present; ownership verified.
 * For GET single / PATCH / DELETE: record fetched to get parent, then verified.
 * For POST: parent binding in body verified.
 */
const TIER2_TABLES: Record<string, Tier2Config> = {
  prmtk_statusreports: {
    parentField: "_prmtk_research_value",
    parentTable: "prmtk_researchs",
  },
  // budgetheaders can belong to either a research OR an application
  prmtk_budgetheaders: {
    parentField: "_prmtk_research_value",
    parentTable: "prmtk_researchs",
    altParentField: "_prmtk_application_value",
    altParentTable: "prmtk_applications",
  },
  prmtk_budgetlineitems: {
    parentField: "_prmtk_budgetheader_value",
    parentTable: "prmtk_budgetheaders",
  },
  prmtk_researchteammembers: {
    parentField: "_prmtk_research_value",
    parentTable: "prmtk_researchs",
  },
  prmtk_applicationteammembers: {
    parentField: "_prmtk_application_value",
    parentTable: "prmtk_applications",
  },
  prmkt_disseminationactivities: {
    parentField: "_prmkt_research_value",
    parentTable: "prmtk_researchs",
  },
  prmtk_deliverables: {
    parentField: "_prmtk_research_value",
    parentTable: "prmtk_researchs",
  },
  prmkt_workforcedevelopments: {
    parentField: "_prmkt_research_value",
    parentTable: "prmtk_researchs",
  },
  prmkt_researchmanuscriptsandpublications: {
    parentField: "_prmkt_research_value",
    parentTable: "prmtk_researchs",
  },
  prmkt_researchactivities: {
    parentField: "_prmkt_research_value",
    parentTable: "prmtk_researchs",
  },
  prmtk_applicationcasehistories: {
    parentField: "_prmtk_application_value",
    parentTable: "prmtk_applications",
  },
  prmtk_disseminationapplicants: {
    parentField: "_prmtk_research_value",
    parentTable: "prmtk_researchs",
  },
};

// Tier 3 (public / reference) tables — prmtk_grantcycles, prmtk_researchareas,
// accounts, and all _layout/* paths — are not listed and pass through unchanged.

// ─── Ownership Verification Cache ────────────────────────────────────────────
// Key: "{tableName}:{recordId}" → cached owner id, expires after 5 minutes.
const ownershipCache = new Map<string, { ownerId: string; expiry: number }>();

// ─── Proxy Helpers ────────────────────────────────────────────────────────────

function extractTableName(targetPath: string): string | null {
  const m = targetPath.match(/\/api\/data\/v9\.2\/([^(?/]+)/);
  return m ? m[1] : null;
}

function extractRecordId(targetPath: string): string | null {
  const m = targetPath.match(/\(([0-9a-f-]{36})\)/i);
  return m ? m[1] : null;
}

function isSingleRecord(targetPath: string): boolean {
  return /\([0-9a-f-]{36}\)/i.test(targetPath);
}

/** Append an owner clause to the $filter param on the target URL. */
function enforceOwnerFilter(
  url: URL,
  config: Tier1Config,
  session: SessionPayload,
): void {
  const ownerValue = config.useEmail
    ? `'${session.email}'`
    : session.contactId;
  const clause = `${config.ownerField} eq ${ownerValue}`;
  const existing = url.searchParams.get("$filter");
  url.searchParams.set("$filter", existing ? `${existing} and ${clause}` : clause);
}

/** Overwrite the owner bind field in the POST body so callers cannot spoof it. */
function injectOwnerInBody(
  req: express.Request,
  config: Tier1Config,
  session: SessionPayload,
): void {
  if (!req.body || !config.ownerBindField) return;
  req.body[config.ownerBindField] = `/contacts(${session.contactId})`;
  // Remove the plain value field if present to avoid conflicting data
  if (config.ownerField && req.body[config.ownerField] !== undefined) {
    delete req.body[config.ownerField];
  }
}

/** Extract a GUID for a given field from an OData $filter string. */
function extractIdFromFilter(filter: string, field: string): string | null {
  const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = filter.match(
    new RegExp(`${escaped}\\s+eq\\s+'?([0-9a-f-]{36})'?`, "i"),
  );
  return m ? m[1] : null;
}

/** Extract a GUID for a given parent field from a request body.
 *  Handles both the plain "_xxx_value" form and "@odata.bind" form. */
function extractIdFromBody(body: any, field: string): string | null {
  if (!body) return null;
  if (typeof body[field] === "string") {
    const m = (body[field] as string).match(/([0-9a-f-]{36})/i);
    if (m) return m[1];
  }
  // Derive nav-property hint: "_prmtk_research_value" → "prmtk_research"
  const navHint = field.replace(/^_/, "").replace(/_value$/, "").toLowerCase();
  for (const [key, value] of Object.entries(body)) {
    if (
      key.endsWith("@odata.bind") &&
      key.toLowerCase().includes(navHint) &&
      typeof value === "string"
    ) {
      const m = (value as string).match(/([0-9a-f-]{36})/i);
      if (m) return m[1];
    }
  }
  return null;
}

/** Verify that a Tier 1 record is owned by the session user. Uses the cache. */
async function verifyTier1Ownership(
  tableName: string,
  recordId: string,
  session: SessionPayload,
  serverToken: string,
): Promise<boolean> {
  const config = TIER1_TABLES[tableName];
  if (!config) return false;

  const cacheKey = `${tableName}:${recordId}`;
  const cached = ownershipCache.get(cacheKey);
  if (cached && cached.expiry > Date.now()) {
    return config.useEmail
      ? cached.ownerId.toLowerCase() === session.email.toLowerCase()
      : cached.ownerId === session.contactId;
  }

  try {
    const url = `${DATAVERSE_BASE_URL}/api/data/v9.2/${tableName}(${recordId})?$select=${config.ownerField}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${serverToken}`,
        Accept: "application/json",
        "OData-Version": "4.0",
      },
    });
    if (!res.ok) return false;
    const data = await res.json();
    const ownerId: string | null = data[config.ownerField] ?? null;
    if (ownerId) {
      ownershipCache.set(cacheKey, {
        ownerId,
        expiry: Date.now() + 5 * 60 * 1000,
      });
    }
    if (!ownerId) return false;
    return config.useEmail
      ? ownerId.toLowerCase() === session.email.toLowerCase()
      : ownerId === session.contactId;
  } catch {
    return false;
  }
}

/** Recursively verify that a record (Tier 1 or Tier 2) belongs to the session user. */
async function verifyParentOwnership(
  parentTable: string,
  parentId: string,
  session: SessionPayload,
  serverToken: string,
): Promise<boolean> {
  if (TIER1_TABLES[parentTable]) {
    return verifyTier1Ownership(parentTable, parentId, session, serverToken);
  }
  if (TIER2_TABLES[parentTable]) {
    const cfg = TIER2_TABLES[parentTable];
    const fields = [cfg.parentField, cfg.altParentField]
      .filter(Boolean)
      .join(",");
    try {
      const url = `${DATAVERSE_BASE_URL}/api/data/v9.2/${parentTable}(${parentId})?$select=${fields}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${serverToken}`,
          Accept: "application/json",
          "OData-Version": "4.0",
        },
      });
      if (!res.ok) return false;
      const data = await res.json();
      const pid: string | null = data[cfg.parentField] ?? null;
      if (pid) return verifyParentOwnership(cfg.parentTable, pid, session, serverToken);
      if (cfg.altParentField && cfg.altParentTable) {
        const altPid: string | null = data[cfg.altParentField] ?? null;
        if (altPid)
          return verifyParentOwnership(cfg.altParentTable, altPid, session, serverToken);
      }
      return false;
    } catch {
      return false;
    }
  }
  return false;
}

/** Verify ownership of a single Tier 2 record by fetching its parent reference. */
async function verifyTier2RecordOwnership(
  tableName: string,
  config: Tier2Config,
  recordId: string,
  session: SessionPayload,
  serverToken: string,
): Promise<boolean> {
  const fields = [config.parentField, config.altParentField]
    .filter(Boolean)
    .join(",");
  try {
    const url = `${DATAVERSE_BASE_URL}/api/data/v9.2/${tableName}(${recordId})?$select=${fields}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${serverToken}`,
        Accept: "application/json",
        "OData-Version": "4.0",
      },
    });
    if (!res.ok) return false;
    const data = await res.json();
    const pid: string | null = data[config.parentField] ?? null;
    if (pid)
      return verifyParentOwnership(config.parentTable, pid, session, serverToken);
    if (config.altParentField && config.altParentTable) {
      const altPid: string | null = data[config.altParentField] ?? null;
      if (altPid)
        return verifyParentOwnership(
          config.altParentTable,
          altPid,
          session,
          serverToken,
        );
    }
    return false;
  } catch {
    return false;
  }
}

// ─── Dataverse Proxy Handler ──────────────────────────────────────────────────

async function handleDataverseProxy(
  req: express.Request,
  res: express.Response,
) {
  try {
    let apiPath = req.path;
    console.log(`[Proxy] ${req.method} ${req.path}`);

    // Translate /_api/ → /api/data/v9.2/
    let targetPath = apiPath;
    if (apiPath.startsWith("/_api/")) {
      targetPath = apiPath.replace(/^\/_api\//, "/api/data/v9.2/");
    }

    const fullUrl = new URL(DATAVERSE_BASE_URL + targetPath);
    if (req.url.includes("?")) {
      fullUrl.search = req.url.substring(req.url.indexOf("?"));
    }

    // Acquire server token early — needed for both auth headers and ownership checks
    const serverToken = await acquireServerToken();

    // ── Access Control Enforcement ────────────────────────────────────────────
    const rawSession = req.headers["x-session-token"] as string | undefined;
    const session = rawSession ? verifyToken(rawSession) : null;
    const tableName = extractTableName(targetPath);
    const single = isSingleRecord(targetPath);

    if (tableName && TIER1_TABLES[tableName]) {
      const tier1 = TIER1_TABLES[tableName];

      if (!session) {
        // contacts returns empty for unauthenticated requests; all others → 401
        if (tableName === "contacts") {
          console.log("[Access] Unauthenticated contacts request → empty result");
          return res.json({ value: [] });
        }
        console.log(`[Access] 401 – unauthenticated access to Tier 1: ${tableName}`);
        return res.status(401).json({ error: "Authentication required" });
      }

      if (req.method === "GET") {
        if (!single) {
          // Collection GET: append server-enforced owner filter
          enforceOwnerFilter(fullUrl, tier1, session);
          console.log(`[Access] Owner filter enforced on ${tableName} collection`);
        } else {
          // Single-record GET: verify ownership before returning
          const recordId = extractRecordId(targetPath);
          if (!recordId || !serverToken)
            return res
              .status(!serverToken ? 503 : 403)
              .json({ error: !serverToken ? "Service unavailable" : "Access denied" });
          const owned = await verifyTier1Ownership(tableName, recordId, session, serverToken);
          if (!owned) {
            console.log(`[Access] 403 – ${tableName}(${recordId}) not owned by ${session.contactId}`);
            return res.status(403).json({ error: "Access denied" });
          }
        }
      } else if (req.method === "POST") {
        // Inject server-verified owner into request body
        injectOwnerInBody(req, tier1, session);
        console.log(`[Access] Owner injected into POST body for ${tableName}`);
      } else if (req.method === "PATCH" || req.method === "DELETE") {
        const recordId = extractRecordId(targetPath);
        if (!recordId || !serverToken)
          return res
            .status(!serverToken ? 503 : 403)
            .json({ error: !serverToken ? "Service unavailable" : "Access denied" });
        const owned = await verifyTier1Ownership(tableName, recordId, session, serverToken);
        if (!owned) {
          console.log(`[Access] 403 – ${req.method} denied on ${tableName}(${recordId})`);
          return res.status(403).json({ error: "Access denied" });
        }
      }
    } else if (tableName && TIER2_TABLES[tableName]) {
      const tier2 = TIER2_TABLES[tableName];

      if (!session) {
        console.log(`[Access] 401 – unauthenticated access to Tier 2: ${tableName}`);
        return res.status(401).json({ error: "Authentication required" });
      }
      if (!serverToken) {
        console.log("[Access] 503 – server token unavailable for Tier 2 enforcement");
        return res.status(503).json({ error: "Service unavailable" });
      }

      if (req.method === "GET") {
        if (!single) {
          // Collection GET: require parent filter and verify parent ownership
          const rawFilter = fullUrl.searchParams.get("$filter") ?? "";
          let parentId = extractIdFromFilter(rawFilter, tier2.parentField);
          let parentTable = tier2.parentTable;
          if (!parentId && tier2.altParentField && tier2.altParentTable) {
            parentId = extractIdFromFilter(rawFilter, tier2.altParentField);
            parentTable = tier2.altParentTable;
          }
          if (!parentId) {
            console.log(`[Access] 400 – missing parent filter for Tier 2: ${tableName}`);
            return res.status(400).json({ error: "A parent record filter is required" });
          }
          const owned = await verifyParentOwnership(parentTable, parentId, session, serverToken);
          if (!owned) {
            console.log(`[Access] 403 – parent ${parentId} not owned by ${session.contactId}`);
            return res.status(403).json({ error: "Access denied" });
          }
        } else {
          // Single-record GET: fetch record to get parent, verify chain
          const recordId = extractRecordId(targetPath);
          if (!recordId) return res.status(403).json({ error: "Access denied" });
          const owned = await verifyTier2RecordOwnership(tableName, tier2, recordId, session, serverToken);
          if (!owned) {
            console.log(`[Access] 403 – ${tableName}(${recordId}) not accessible`);
            return res.status(403).json({ error: "Access denied" });
          }
        }
      } else if (req.method === "POST") {
        let parentId = extractIdFromBody(req.body, tier2.parentField);
        let parentTable = tier2.parentTable;
        if (!parentId && tier2.altParentField && tier2.altParentTable) {
          parentId = extractIdFromBody(req.body, tier2.altParentField);
          parentTable = tier2.altParentTable;
        }
        if (!parentId)
          return res.status(400).json({ error: "A parent record reference is required" });
        const owned = await verifyParentOwnership(parentTable, parentId, session, serverToken);
        if (!owned) {
          console.log(`[Access] 403 – POST to ${tableName} with unowned parent ${parentId}`);
          return res.status(403).json({ error: "Access denied" });
        }
      } else if (req.method === "PATCH" || req.method === "DELETE") {
        const recordId = extractRecordId(targetPath);
        if (!recordId) return res.status(403).json({ error: "Access denied" });
        const owned = await verifyTier2RecordOwnership(tableName, tier2, recordId, session, serverToken);
        if (!owned) {
          console.log(`[Access] 403 – ${req.method} denied on ${tableName}(${recordId})`);
          return res.status(403).json({ error: "Access denied" });
        }
      }
    }
    // Tier 3 (public tables, _layout/*) — falls through without enforcement

    console.log(`[Proxy] Final target URL: ${fullUrl.toString()}`);

    // ── Build Request Headers ─────────────────────────────────────────────────
    const fetchHeaders: HeadersInit = {
      Accept: "application/json",
      "OData-Version": "4.0",
      "OData-MaxVersion": "4.0",
      "If-None-Match": "null",
    };

    if (serverToken) {
      fetchHeaders["Authorization"] = `Bearer ${serverToken}`;
    } else if (req.headers.authorization) {
      console.log("[Proxy] No server token; forwarding client Authorization header");
      fetchHeaders["Authorization"] = String(req.headers.authorization);
    }
    if (req.headers["__requestverificationtoken"]) {
      fetchHeaders["__RequestVerificationToken"] = String(
        req.headers["__requestverificationtoken"],
      );
    }
    if (req.headers["content-type"]) {
      fetchHeaders["Content-Type"] = String(req.headers["content-type"]);
    }

    // ── Proxy Request ─────────────────────────────────────────────────────────
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

    console.log(`[Proxy] Response: ${response.status} ${response.statusText}`);

    const contentType = response.headers.get("content-type");
    let data: any;
    if (contentType?.includes("application/json")) {
      data = await response.json();
    }
    else if(contentType?.includes("application/octet-stream"))
    {
      data= await response.arrayBuffer();
    }
    else {
      data = await response.text();
    }

    // Normalize Dataverse 401 with a valid OData value array to 200
    const status =
      response.status === 401 &&
      typeof data === "object" &&
      Array.isArray(data?.value)
        ? 200
        : response.status;
    res.status(status);
    if (status !== response.status) {
      console.log("[Proxy] Normalized 401 with OData value array to 200");
    }

    if (response.headers.get("content-type"))
      res.setHeader("Content-Type", response.headers.get("content-type")!);
    if (response.headers.get("odata-entityid"))
      res.setHeader("OData-EntityId", response.headers.get("odata-entityid")!);
    if (response.headers.get("odata-version"))
      res.setHeader("OData-Version", response.headers.get("odata-version")!);
    res.setHeader("Access-Control-Allow-Credentials", "true");

    if (contentType?.includes("application/json")) {
     
      res.json(data);
    } 
    else if(contentType?.includes("application/octet-stream")){
      res.end(Buffer.from(data));
    }
    else {
      res.send(data);
    }
  }
  } catch (err: any) {
    console.error(`[Proxy] Error on ${req.method} ${req.path}:`, err?.message);
    res.status(502).json({
      error: "Proxy error",
      details: err?.message || String(err),
      target: DATAVERSE_BASE_URL + req.path,
    });
  }
}

// ─── Express App ──────────────────────────────────────────────────────────────

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  app.get("/api/ping", (_req, res) => {
    res.json({ message: process.env.PING_MESSAGE ?? "ping" });
  });

  app.get("/api/demo", handleDemo);

  // ── Session Token Endpoint ──────────────────────────────────────────────────
  // Client posts the B2C idToken received from MSAL; server decodes the email,
  // looks up the contactId in Dataverse, and returns a signed session token.
  //
  // TODO (hardening): validate the RS256 signature of the idToken against
  // Azure B2C's JWKS endpoint before trusting the email claim.
  app.post("/api/auth/session", async (req, res) => {
    const { idToken } = req.body ?? {};
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ error: "idToken required" });
    }

    // Decode JWT payload (base64url — no signature verification, see TODO above)
    let email: string | null = null;
    try {
      const parts = idToken.split(".");
      if (parts.length !== 3) throw new Error("Not a valid JWT");
      const payload = JSON.parse(
        Buffer.from(parts[1], "base64url").toString(),
      );
      email =
        payload.email ??
        payload.preferred_username ??
        payload.upn ??
        null;
    } catch {
      return res.status(400).json({ error: "Invalid token format" });
    }

    if (!email) {
      return res
        .status(400)
        .json({ error: "Email claim not found in token" });
    }

    const serverToken = await acquireServerToken();
    if (!serverToken) {
      return res.status(503).json({ error: "Service unavailable" });
    }

    try {
      // Look up the contact record that matches this email address
      const contactUrl = `${DATAVERSE_BASE_URL}/api/data/v9.2/contacts?$filter=emailaddress1 eq '${email}'&$select=contactid`;
      const contactRes = await fetch(contactUrl, {
        headers: {
          Authorization: `Bearer ${serverToken}`,
          Accept: "application/json",
          "OData-Version": "4.0",
        },
      });
      if (!contactRes.ok) {
        console.error("[Session] Contact lookup failed:", contactRes.status);
        return res.status(503).json({ error: "Contact lookup failed" });
      }
      const contactData = await contactRes.json();
      const contactId: string | undefined =
        contactData?.value?.[0]?.contactid;
      if (!contactId) {
        console.warn(`[Session] No contact found for email: ${email}`);
        return res.status(404).json({ error: "Contact not found" });
      }

      const now = Date.now();
      const sessionToken = signToken({
        contactId,
        email,
        iat: now,
        exp: now + SESSION_EXPIRY_MS,
      });

      console.log(
        `[Session] Issued token for ${email} (contact: ${contactId})`,
      );
      return res.json({ sessionToken });
    } catch (err: any) {
      console.error("[Session] Unexpected error:", err?.message);
      return res.status(500).json({ error: "Internal error" });
    }
  });

  // ── Verification Token Endpoint ─────────────────────────────────────────────
  app.get("/api/verification-token", async (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    const FALLBACK_TOKEN =
      "H2mPseS4jqMjdACQIcTLuZYge-isZjkr_Pj37loAqcjZb6dp4bIZao9TZqN2uvXmMVwTGvkFsTtq5tnfPGfoCj2U15FDO8T8ESjcSTfguKw1";

    try {
      if (!DATAVERSE_BASE_URL) {
        return res.json({ token: FALLBACK_TOKEN, available: true, source: "fallback" });
      }
      const baseUrl = new URL(DATAVERSE_BASE_URL);
      const tokenUrl = `${baseUrl.protocol}//${baseUrl.host}/_layout/tokenhtml`;
      console.log("[TokenAPI] Requesting:", tokenUrl);

      const response = await fetch(tokenUrl, {
        credentials: "include",
        cache: "no-cache",
      });
      if (!response.ok) {
        return res.json({
          token: FALLBACK_TOKEN,
          available: true,
          source: "fallback",
          status: response.status,
        });
      }
      const text = await response.text();
      let token: string | null = null;

      let match = text.match(
        /name=["']__RequestVerificationToken["'][^>]*value=["']([^"']+)/i,
      );
      if (match?.[1]) token = match[1];
      if (!token) {
        match = text.match(
          /value=["']([^"']+)[^>]*name=["']__RequestVerificationToken["']/i,
        );
        if (match?.[1]) token = match[1];
      }
      if (!token) {
        match = text.match(
          /__RequestVerificationToken["\s:=]*["']?([A-Za-z0-9_+/=\-]+)/,
        );
        if (match?.[1]) token = match[1];
      }

      return res.json(
        token
          ? { token, available: true, source: "fetched" }
          : { token: FALLBACK_TOKEN, available: true, source: "fallback" },
      );
    } catch (err: any) {
      return res.json({
        token: FALLBACK_TOKEN,
        available: true,
        source: "fallback",
        error: err?.message,
      });
    }
  });

  // ── Dataverse / Power Pages Proxy ───────────────────────────────────────────
  app.all(/^\/((_api|_layout)\/)/, handleDataverseProxy);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
