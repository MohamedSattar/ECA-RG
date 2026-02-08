import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";

const DATAVERSE_BASE_URL = "https://research-grants-spa.powerappsportals.com";

async function handleDataverseProxy(req: express.Request, res: express.Response) {
  try {
    // Extract the API path after /api/dataverse
    const apiPath = req.path.replace(/^\/api\/dataverse/, "");
    const fullUrl = new URL(DATAVERSE_BASE_URL + apiPath);

    // Preserve query parameters
    if (req.url.includes("?")) {
      const queryPart = req.url.substring(req.url.indexOf("?"));
      fullUrl.search = queryPart;
    }

    // Build headers
    const fetchHeaders: HeadersInit = {};

    if (req.headers.authorization) {
      fetchHeaders["Authorization"] = String(req.headers.authorization);
    }
    if (req.headers["__requestverificationtoken"]) {
      fetchHeaders["__RequestVerificationToken"] = String(req.headers["__requestverificationtoken"]);
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

    // Send response
    if (contentType?.includes("application/json")) {
      res.json(data);
    } else {
      res.send(data);
    }
  } catch (err) {
    console.error("Dataverse proxy error:", err);
    res.status(502).json({ error: "Proxy error", details: String(err) });
  }
}

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Dataverse API proxy - forward all requests to Dataverse API
  app.all(/^\/api\/dataverse\//, handleDataverseProxy);

  return app;
}
