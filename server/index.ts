import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";

const DATAVERSE_BASE_URL = "https://research-grants-spa.powerappsportals.com";

async function handleDataverseProxy(
  req: express.Request,
  res: express.Response,
) {
  try {
    // Extract the API path (everything after the domain)
    let apiPath = req.path;

    console.log(`[Proxy] Original request path: ${req.path}`);
    console.log(`[Proxy] Original request URL: ${req.url}`);


    const fullUrl = new URL(DATAVERSE_BASE_URL + apiPath);

    // Preserve query parameters
    if (req.url.includes("?")) {
      const queryPart = req.url.substring(req.url.indexOf("?"));
      fullUrl.search = queryPart;
      console.log(`[Proxy] Query parameters added: ${queryPart}`);
    }

    // Log the request for debugging
    console.log(`[Proxy] ${req.method} ${req.path}`);
    console.log(`[Proxy] Final target URL: ${fullUrl.toString()}`);
    console.log(`[Proxy] Headers:`, {
      authorization: req.headers.authorization ? "***" : "none",
      requestverificationtoken: req.headers["__requestverificationtoken"] ? "***" : "none",
    });

    // Build headers
    const fetchHeaders: HeadersInit = {};

    if (req.headers.authorization) {
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

    // Set response status
    res.status(response.status);

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

  // Dataverse API proxy - forward all /_api, /_layout, and /_images requests
  app.all(/^\/((_api|_layout|_images)\/)/, handleDataverseProxy);

  // Fallback for unmatched routes
  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}
