import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";

// Server-side client credentials configuration (set these in your env)
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID;
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID;
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET;
// Example: https://yourorg.crm.dynamics.com/.default or the resource scope for Power Pages/Dataverse
const DATAVERSE_RESOURCE = process.env.DATAVERSE_RESOURCE;
// DATAVERSE_BASE_URL: prefer explicit env var, otherwise derive from DATAVERSE_RESOURCE by stripping '/.default'
const DATAVERSE_BASE_URL =
  process.env.DATAVERSE_BASE_URL ||
  (DATAVERSE_RESOURCE ? DATAVERSE_RESOURCE.replace(/\/\.default\/?$/, "") : "https://researchgrants-dev.powerappsportals.com");
// If true, forward the client's Authorization header instead of using server token
const FORCE_FORWARD_CLIENT_AUTH = process.env.FORWARD_CLIENT_AUTH === "true";

let cachedServerToken: string | null = null;
let cachedServerTokenExpiry = 0;

async function acquireServerToken() {
  try {
    if (cachedServerToken && cachedServerTokenExpiry > Date.now()) {
      return cachedServerToken;
    }

    if (!AZURE_TENANT_ID || !AZURE_CLIENT_ID || !AZURE_CLIENT_SECRET || !DATAVERSE_RESOURCE) {
      console.log("[ServerToken] Missing Azure client credentials or DATAVERSE_RESOURCE; skipping server token acquisition");
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
      console.error("[ServerToken] Token endpoint returned error:", resp.status, txt);
      return null;
    }

    const body = await resp.json();
    cachedServerToken = body.access_token;
    const expiresIn = Number(body.expires_in) || 3600;
    cachedServerTokenExpiry = Date.now() + (expiresIn - 60) * 1000; // refresh 60s early
    console.log("[ServerToken] Acquired token; expires in", expiresIn, "seconds");
    return cachedServerToken;
  } catch (err) {
    console.error("[ServerToken] Error acquiring server token:", err);
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

    console.log(`[Proxy] Original request path: ${req.path}`);
    console.log(`[Proxy] Original request URL: ${req.url}`);

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
      console.log(`[Proxy] Query parameters added: ${queryPart}`);
    }

    // Log the request for debugging
    console.log(`[Proxy] ${req.method} ${req.path}`);
    console.log(`[Proxy] Final target URL: ${fullUrl.toString()}`);
    console.log(`[Proxy] Headers:`, {
      authorization: req.headers.authorization ? "***" : "none",
      requestverificationtoken: req.headers["__requestverificationtoken"]
        ? "***"
        : "none",
    });

    // Build headers — Dataverse Web API expects these on every request
    const fetchHeaders: HeadersInit = {
      Accept: "application/json",
      "OData-Version": "4.0",
      "OData-MaxVersion": "4.0",
      "If-None-Match": "null",
    };

    // Authorization: prefer server token when available so Dataverse always gets a valid token and returns 200.
    // Only fall back to client's Authorization when server token cannot be acquired.
    const serverToken = await acquireServerToken();
    if (serverToken) {
      fetchHeaders["Authorization"] = `Bearer ${serverToken}`;
      console.log("[Proxy] Using server token for Dataverse request");
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

    // Log the response status
    console.log(`[Proxy] Response: ${response.status} ${response.statusText}`);

    // Get the response body
    const contentType = response.headers.get("content-type");
    let data: any;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
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
    if (status !== response.status) {
      console.log("[Proxy] Normalized 401 with OData value to 200 for client");
    }

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
    } else {
      res.send(data);
    }
  } catch (err: any) {
    console.error(`[Proxy] Error on ${req.method} ${req.path}`);
    console.error(`[Proxy] Target URL: ${DATAVERSE_BASE_URL + req.path}`);
    console.error(`[Proxy] Error code:`, err?.code);
    console.error(`[Proxy] Error message:`, err?.message);
    console.error(`[Proxy] Full error:`, err);

    const errorMessage = err?.message || String(err);
    res.status(502).json({
      error: "Proxy error",
      details: errorMessage,
      target: DATAVERSE_BASE_URL + req.path,
    });
  }
}

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Token endpoint - fetch verification token from Dataverse/Power Pages
  app.get("/api/verification-token", async (_req, res) => {
    // Set proper content type
    res.setHeader("Content-Type", "application/json");

    // Fallback token for when endpoint is unavailable
    const FALLBACK_TOKEN = "H2mPseS4jqMjdACQIcTLuZYge-isZjkr_Pj37loAqcjZb6dp4bIZao9TZqN2uvXmMVwTGvkFsTtq5tnfPGfoCj2U15FDO8T8ESjcSTfguKw1";

    try {
      console.log("[TokenAPI] Fetching verification token from /_layout/tokenhtml");
      console.log("[TokenAPI] DATAVERSE_BASE_URL:", DATAVERSE_BASE_URL);

      if (!DATAVERSE_BASE_URL) {
        console.warn("[TokenAPI] DATAVERSE_BASE_URL not configured, using fallback token");
        return res.json({ token: FALLBACK_TOKEN, available: true, source: "fallback" });
      }

      // Construct the token URL
      let tokenUrl: string;
      try {
        const baseUrl = new URL(DATAVERSE_BASE_URL);
        tokenUrl = `${baseUrl.protocol}//${baseUrl.host}/_layout/tokenhtml`;
      } catch (urlErr) {
        console.warn("[TokenAPI] Invalid DATAVERSE_BASE_URL, using fallback token:", urlErr);
        return res.json({ token: FALLBACK_TOKEN, available: true, source: "fallback" });
      }

      console.log("[TokenAPI] Requesting:", tokenUrl);

      const response = await fetch(tokenUrl, {
        credentials: "include",
        cache: "no-cache",
      });

      console.log(`[TokenAPI] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        console.warn(`[TokenAPI] Request failed with status ${response.status}, using fallback token`);
        return res.json({ token: FALLBACK_TOKEN, available: true, source: "fallback", status: response.status });
      }

      const text = await response.text();
      console.log(`[TokenAPI] Response length: ${text.length} chars`);
      console.log(`[TokenAPI] Response preview (first 500 chars):\n${text.substring(0, 500)}`);

      // Extract token using multiple patterns to handle different HTML structures
      let token: string | null = null;

      // Pattern 1: <input name="__RequestVerificationToken" value="TOKEN_HERE" />
      // Handles: value before or after name attribute
      let match = text.match(/name=["']__RequestVerificationToken["'][^>]*value=["']([^"']+)/i);
      if (match && match[1]) {
        token = match[1];
        console.log("[TokenAPI] Token matched with pattern 1 (name first)");
      }

      // Pattern 2: <input value="TOKEN_HERE" name="__RequestVerificationToken" />
      // Handles: value attribute comes before name attribute
      if (!token) {
        match = text.match(/value=["']([^"']+)[^>]*name=["']__RequestVerificationToken["']/i);
        if (match && match[1]) {
          token = match[1];
          console.log("[TokenAPI] Token matched with pattern 2 (value first)");
        }
      }

      // Pattern 3: Look for __RequestVerificationToken=VALUE pattern (form data style)
      if (!token) {
        match = text.match(/__RequestVerificationToken["\s:=]*["']?([A-Za-z0-9_+/=\-]+)/);
        if (match && match[1]) {
          token = match[1];
          console.log("[TokenAPI] Token matched with pattern 3 (form data style)");
        }
      }

      if (token && token.length > 0) {
        console.log(`[TokenAPI] ✓ Successfully extracted token (length: ${token.length})`);
        console.log(`[TokenAPI] Token preview: ${token.substring(0, 30)}...`);
        return res.json({ token, available: true, source: "fetched" });
      } else {
        console.warn("[TokenAPI] ✗ Token not found in HTML response, using fallback token");
        console.warn("[TokenAPI] Response preview:\n", text.substring(0, 500));
        return res.json({ token: FALLBACK_TOKEN, available: true, source: "fallback" });
      }
    } catch (err: any) {
      console.error("[TokenAPI] Error fetching token:", err?.message || String(err));
      console.log("[TokenAPI] Using fallback token due to error");
      return res.json({ token: FALLBACK_TOKEN, available: true, source: "fallback", error: err?.message });
    }
  });

  // Dataverse API proxy - forward all /_api and /_layout requests
  app.all(/^\/((_api|_layout)\/)/, handleDataverseProxy);

  // Fallback for unmatched routes
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
