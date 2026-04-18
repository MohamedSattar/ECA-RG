import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { buildCorsOptions } from "./security/corsOptions";
import {
  clientErrorJson,
  isProductionNodeEnv,
} from "./security/clientSafeError";
import {
  authSessionRateLimit,
  verificationTokenRateLimit,
} from "./security/rateLimits";
import {
  getBudgetHeadersByApplication,
  getBudgetHeader,
  createBudgetHeader as createBudgetHeaderRoute,
  getBudgetLineItems,
  createBudgetLineItem,
  updateBudgetLineItem,
  deleteBudgetLineItem,
  getBudgetSpendsByLineItem,
  upsertBudgetSpends,
} from "./routes/budget";
import { handleAuthLogout, handleAuthSession } from "./routes/authSession";
import { requireUser } from "./middleware/requireUser";
import { requireUserUnlessPublicDataverseGet } from "./middleware/requireUserUnlessPublicDataverseGet";
import { getVerificationTokenFallback, TOKENHTML_BASE_URL } from "./auth/env";
import { isDataverseGuid } from "./auth/guid";
import {
  resolveImageEntitySetName,
  isAllowedImageAttributeName,
} from "./auth/dataverseImageAllowlist";
import { dataverseProxyAllowlist } from "./middleware/dataverseProxyAllowlist";
import {
  filterScopedCollectionJson,
  prepareProxyUserScope,
} from "./security/dataverseProxyUserScope";
import { verifyScopedSingleRecordAsync } from "./security/dataverseScopeVerify";
// Server-side client credentials configuration (set these in your env)
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
const AZURE_LOGIN_BASE_URL =
  process.env.AZURE_LOGIN_BASE_URL || "https://login.microsoftonline.com";
// Example: https://yourorg.crm.dynamics.com/.default or the resource scope for Power Pages/Dataverse
const DATAVERSE_RESOURCE = process.env.DATAVERSE_RESOURCE;
// DATAVERSE_BASE_URL: prefer explicit env var, otherwise derive from DATAVERSE_RESOURCE by stripping '/.default'
const DATAVERSE_BASE_URL =
  process.env.DATAVERSE_BASE_URL ||
  (DATAVERSE_RESOURCE
    ? DATAVERSE_RESOURCE.replace(/\/\.default\/?$/, "")
    : "https://eca.crm15.dynamics.com");
let cachedServerToken: string | null = null;
let cachedServerTokenExpiry = 0;

async function acquireServerToken() {
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
      return null;
    }

    const tokenUrl = `${AZURE_LOGIN_BASE_URL}/${AZURE_TENANT_ID}/oauth2/v2.0/token`;
    const params = new URLSearchParams();
    params.append("client_id", AZURE_CLIENT_ID);
    params.append("client_secret", AZURE_CLIENT_SECRET);
    params.append("grant_type", "client_credentials");
    params.append("scope", DATAVERSE_RESOURCE);

    const resp = await fetch(tokenUrl, {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return null;
    }

    const body = await resp.json();
    cachedServerToken = body.access_token;
    const expiresIn = Number(body.expires_in) || 3600;
    cachedServerTokenExpiry = Date.now() + (expiresIn - 60) * 1000; // refresh 60s early
    return cachedServerToken;
  } catch (err) {
    return null;
  }
}

async function handleDataverseProxy(
  req: express.Request,
  res: express.Response,
) {
  try {
    // Extract the API path (everything after the domain)
    let apiPath = req.path;

    // Translate incoming proxy paths to the target Dataverse/CRM API paths when needed.
    // e.g. /_api/contacts -> /api/data/v9.2/contacts
    let targetPath = apiPath;
    if (apiPath.startsWith("/_api/")) {
      targetPath = apiPath.replace(/^\/_api\//, "/api/data/v9.2/");
    }

    const fullUrl = new URL(DATAVERSE_BASE_URL + targetPath);

    // Preserve query parameters
    if (req.url.includes("?")) {
      const queryPart = req.url.substring(req.url.indexOf("?"));
      // URL.search expects without the leading '?'
      fullUrl.search = queryPart;
    }

    const scopePrep = await prepareProxyUserScope(req, fullUrl);
    if (scopePrep.ok === false) {
      return res.status(scopePrep.status).json(scopePrep.body);
    }
    const { scopeContext } = scopePrep;

    // Build headers — Dataverse Web API expects these on every request
    const fetchHeaders: HeadersInit = {
      Accept: "application/json",
      "OData-Version": "4.0",
      "OData-MaxVersion": "4.0",
      "If-None-Match": "null",
    };

    // Dataverse requires the application token — never forward the user's session JWT.
    const serverToken = await acquireServerToken();
    if (!serverToken) {
      return res.status(503).json({
        error: "Service unavailable",
        message:
          "Server Dataverse token is not configured or could not be acquired",
      });
    }
    fetchHeaders["Authorization"] = `Bearer ${serverToken}`;

    if (req.headers["__requestverificationtoken"]) {
      fetchHeaders["__RequestVerificationToken"] = String(
        req.headers["__requestverificationtoken"],
      );
    }
    if (req.user?.email) {
      fetchHeaders["x-user-email"] = req.user.email;
    }
    if (req.user?.sub) {
      fetchHeaders["x-user-id"] = req.user.sub;
    }
    if (req.headers["content-type"]) {
      fetchHeaders["Content-Type"] = String(req.headers["content-type"]);
    }

    // Prepare request body
    let body: string | undefined;
    if (req.method !== "GET" && req.method !== "HEAD") {
      body = JSON.stringify(req.body);
    }

    // Make the proxy request
    const response = await fetch(fullUrl.toString(), {
      method: req.method,
      headers: fetchHeaders,
      body,
      credentials: "include",
    });

    // Get the response body
    const contentType = response.headers.get("content-type");
    let data: any;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else if (contentType?.includes("application/octet-stream")) {
      data = await response.arrayBuffer();
    } else {
      data = await response.text();
    }

    // Apply row scope to JSON payloads we actually return. Must run for the 401→200 coerce path too:
    // otherwise integration-token 401 responses could skip filterScopedCollectionJson and leak rows.
    const scopeEligible =
      scopeContext &&
      contentType?.includes("application/json") &&
      req.method !== "HEAD" &&
      typeof data === "object" &&
      data !== null;

    if (scopeEligible) {
      const collection401Coerce =
        response.status === 401 &&
        Array.isArray((data as { value?: unknown }).value);
      const applyRowScope = response.ok || collection401Coerce;

      if (applyRowScope) {
        if (scopeContext.singleRecord) {
          if (response.ok) {
            const allowed = await verifyScopedSingleRecordAsync(
              data,
              scopeContext.entitySet,
              scopeContext.contactId,
              scopeContext.recordKey,
            );
            if (!allowed) {
              return res.status(403).json({
                error: "Forbidden",
                message: "Record is not accessible for this user",
              });
            }
          }
        } else {
          data = filterScopedCollectionJson(data, scopeContext);
        }
      }
    }

    // If Dataverse returned 401 but sent a valid OData payload (e.g. value array), treat as success
    // so the client can use the data instead of failing on 401.
    const status =
      response.status === 401 &&
      typeof data === "object" &&
      Array.isArray(data?.value)
        ? 200
        : response.status;
    res.status(status);

    // Set response headers
    if (response.headers.get("content-type")) {
      res.setHeader("Content-Type", response.headers.get("content-type")!);
    }
    if (response.headers.get("odata-entityid")) {
      res.setHeader("OData-EntityId", response.headers.get("odata-entityid")!);
    }
    if (response.headers.get("odata-version")) {
      res.setHeader("OData-Version", response.headers.get("odata-version")!);
    }

    // Ensure CORS headers are set
    res.setHeader("Access-Control-Allow-Credentials", "true");

    // Send response
    if (contentType?.includes("application/json")) {
      res.json(data);
    } else if (contentType?.includes("application/octet-stream")) {
      res.end(Buffer.from(data));
    } else {
      res.send(data);
    }
  } catch (err: unknown) {
    res.status(502).json(
      clientErrorJson("Proxy error", err, {
        target: DATAVERSE_BASE_URL + req.path,
      }),
    );
  }
}

export function createServer() {
  const app = express();

  // Middleware — set CORS_ORIGINS (comma-separated) in production when UI and API differ by origin
  app.use(cors(buildCorsOptions()));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  if (process.env.DISABLE_SAMPLE_API_ROUTES !== "true") {
    app.get("/api/ping", (_req, res) => {
      const ping = process.env.PING_MESSAGE ?? "ping";
      res.json({ message: ping });
    });
    app.get("/api/demo", handleDemo);
  }

  app.post("/api/auth/session", authSessionRateLimit, handleAuthSession);
  app.post("/api/auth/logout", handleAuthLogout);

  // Budget API (server-side Dataverse calls) — requires session JWT
  const budgetRouter = express.Router();
  budgetRouter.use(requireUser);
  budgetRouter.get("/headers", getBudgetHeadersByApplication);
  budgetRouter.get("/headers/:id", getBudgetHeader);
  budgetRouter.post("/headers", createBudgetHeaderRoute);
  budgetRouter.get("/line-items", getBudgetLineItems);
  budgetRouter.post("/line-items", createBudgetLineItem);
  budgetRouter.patch("/line-items/:id", updateBudgetLineItem);
  budgetRouter.delete("/line-items/:id", deleteBudgetLineItem);
  budgetRouter.get("/spends", getBudgetSpendsByLineItem);
  budgetRouter.post("/spends/bulk", upsertBudgetSpends);
  app.use("/api/budget", budgetRouter);

  /** Prefer POWER_PAGES / TOKENHTML_BASE_URL; CRM org host often returns HTML without a token for server fetch. */
  function resolveTokenHtmlUrl(): string | null {
    const raw = TOKENHTML_BASE_URL;
    if (raw) {
      try {
        if (/\/tokenhtml/i.test(raw)) {
          return raw.startsWith("http")
            ? raw
            : `https://${raw.replace(/^\/+/, "")}`;
        }
        const u = new URL(raw.includes("://") ? raw : `https://${raw}`);
        return `${u.origin}/_layout/tokenhtml`;
      } catch (e) {}
    }
    if (!DATAVERSE_BASE_URL) return null;
    try {
      const baseUrl = new URL(DATAVERSE_BASE_URL);
      return `${baseUrl.protocol}//${baseUrl.host}/_layout/tokenhtml`;
    } catch (e) {
      return null;
    }
  }

  function sendVerificationResult(
    res: express.Response,
    token: string | null,
    source: string,
    extra?: Record<string, unknown>,
  ) {
    if (token) {
      return res.json({
        token,
        available: true,
        source,
        ...extra,
      });
    }
    const fallbackToken = getVerificationTokenFallback();
    if (fallbackToken) {
      return res.json({
        token: fallbackToken,
        available: true,
        source: "fallback",
        ...extra,
      });
    }
    return res.status(200).json({
      token: null,
      available: false,
      source,
      ...extra,
    });
  }

  // Token endpoint - fetch verification token from Power Pages tokenhtml (authenticated)
  app.get(
    "/api/verification-token",
    verificationTokenRateLimit,
    requireUser,
    async (_req, res) => {
      res.setHeader("Content-Type", "application/json");

      try {
        const tokenUrl = resolveTokenHtmlUrl();
        if (!tokenUrl) {
          return sendVerificationResult(res, null, "no_base_url");
        }

        const response = await fetch(tokenUrl, {
          credentials: "include",
          cache: "no-cache",
        });

        if (!response.ok) {
          return sendVerificationResult(res, null, "fetch_failed", {
            status: response.status,
          });
        }

        const text = await response.text();

        let token: string | null = null;

        let match = text.match(
          /name=["']__RequestVerificationToken["'][^>]*value=["']([^"']+)/i,
        );
        if (match?.[1]) {
          token = match[1];
        }

        if (!token) {
          match = text.match(
            /value=["']([^"']+)[^>]*name=["']__RequestVerificationToken["']/i,
          );
          if (match?.[1]) {
            token = match[1];
          }
        }

        if (!token) {
          match = text.match(
            /__RequestVerificationToken["\s:=]*["']?([A-Za-z0-9_+/=\-]+)/,
          );
          if (match?.[1]) {
            token = match[1];
          }
        }

        if (token && token.length > 0) {
          return sendVerificationResult(res, token, "fetched");
        }

        return sendVerificationResult(res, null, "parse_failed");
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return sendVerificationResult(
          res,
          null,
          "exception",
          isProductionNodeEnv() ? {} : { error: message },
        );
      }
    },
  );

  // Public: thumbnails on the home page for anonymous users. Origin/entity/id are validated; Dataverse uses server token.
  app.get("/api/dataverse-image", async (req, res) => {
    const rawUrl = typeof req.query.url === "string" ? req.query.url : null;
    const forceFullImage =
      String(req.query.full || "").toLowerCase() === "true";

    if (!rawUrl) {
      return res.status(400).json({ error: "Missing image url" });
    }

    if (!DATAVERSE_BASE_URL) {
      return res
        .status(500)
        .json({ error: "DATAVERSE_BASE_URL is not configured" });
    }

    try {
      const baseUrl = new URL(DATAVERSE_BASE_URL);
      const targetUrl = new URL(rawUrl, `${baseUrl.origin}/`);
      const entity = targetUrl.searchParams.get("Entity")?.toLowerCase();
      const recordId = targetUrl.searchParams.get("Id");
      const attribute = targetUrl.searchParams.get("Attribute");

      if (targetUrl.origin !== baseUrl.origin) {
        return res.status(400).json({ error: "Image host is not allowed" });
      }

      if (!entity || !recordId || !attribute) {
        return res.status(400).json({ error: "Missing image metadata" });
      }

      if (!isDataverseGuid(recordId)) {
        return res.status(400).json({ error: "Invalid record id" });
      }

      if (!isAllowedImageAttributeName(attribute)) {
        return res.status(400).json({ error: "Invalid attribute" });
      }

      const entitySetName = resolveImageEntitySetName(entity);
      if (!entitySetName) {
        return res
          .status(403)
          .json({ error: "Entity not allowed for image proxy" });
      }

      const imagePath = `/api/data/v9.2/${entitySetName}(${recordId})/${attribute}/$value${forceFullImage ? "?size=full" : ""}`;

      const serverToken = await acquireServerToken();
      if (!serverToken) {
        return res
          .status(503)
          .json({ error: "Server-side Dataverse token unavailable" });
      }

      const response = await fetch(baseUrl.origin + imagePath, {
        headers: {
          Authorization: `Bearer ${serverToken}`,
          Accept:
            "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });

      res.status(response.status);

      const imageBuffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type");
      const inferredContentType =
        contentType && contentType !== "application/octet-stream"
          ? contentType
          : imageBuffer
                .subarray(0, 8)
                .equals(
                  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
                )
            ? "image/png"
            : imageBuffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
              ? "image/jpeg"
              : imageBuffer.subarray(0, 6).toString("ascii") === "GIF87a" ||
                  imageBuffer.subarray(0, 6).toString("ascii") === "GIF89a"
                ? "image/gif"
                : imageBuffer.subarray(0, 4).toString("ascii") === "RIFF" &&
                    imageBuffer.subarray(8, 12).toString("ascii") === "WEBP"
                  ? "image/webp"
                  : "image/jpeg";
      if (inferredContentType) {
        res.setHeader("Content-Type", inferredContentType);
      }
      const cacheControl = response.headers.get("cache-control");
      if (cacheControl) {
        res.setHeader("Cache-Control", cacheControl);
      }
      const contentLength = response.headers.get("content-length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      return res.end(imageBuffer);
    } catch (err: any) {
      return res.status(502).json({
        error: "Image proxy error",
        details: err?.message || String(err),
      });
    }
  });

  // Dataverse API proxy — auth required except GET/HEAD on public entity sets (see publicDataverse.ts)
  app.all(
    /^\/((_api|_layout)\/)/,
    requireUserUnlessPublicDataverseGet,
    dataverseProxyAllowlist,
    handleDataverseProxy,
  );

  return app;
}
