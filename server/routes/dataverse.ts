import { RequestHandler } from "express";

const DATAVERSE_BASE_URL = "https://research-grants-spa.powerappsportals.com";

/**
 * Proxy handler for Dataverse API requests
 * Forwards requests from /api/dataverse/* to the actual Dataverse API
 * Maintains authentication headers and request method
 */
export const handleDataverseProxy: RequestHandler = async (req, res) => {
  try {
    // Extract the path after /api/dataverse
    const path = req.path.replace(/^\/api\/dataverse/, "");

    // Build target URL with original query string
    const url = new URL(`${DATAVERSE_BASE_URL}${path}`);
    if (req.url.includes("?")) {
      const queryString = req.url.substring(req.url.indexOf("?") + 1);
      url.search = queryString;
    }

    // Prepare headers
    const headers: Record<string, string> = {};

    // Pass through important headers from the request
    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }
    if (req.headers["__requestverificationtoken"]) {
      headers["__requestverificationtoken"] = req.headers[
        "__requestverificationtoken"
      ] as string;
    }
    if (req.headers["content-type"]) {
      headers["content-type"] = req.headers["content-type"] as string;
    }

    // Make the request to Dataverse API
    const proxyResponse = await fetch(url.toString(), {
      method: req.method,
      headers,
      body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined,
      credentials: "include",
    });

    // Get response content
    const contentType = proxyResponse.headers.get("content-type");
    let responseData: any;

    if (contentType && contentType.includes("application/json")) {
      responseData = await proxyResponse.json();
    } else {
      responseData = await proxyResponse.text();
    }

    // Set response status and headers
    res.status(proxyResponse.status);

    // Copy important response headers
    const headersToProxy = [
      "content-type",
      "odata-entityid",
      "odata-version",
      "access-control-allow-origin",
    ];

    headersToProxy.forEach((header) => {
      const value = proxyResponse.headers.get(header);
      if (value) {
        res.setHeader(header, value);
      }
    });

    // Send the response
    if (contentType && contentType.includes("application/json")) {
      res.json(responseData);
    } else {
      res.send(responseData);
    }
  } catch (error) {
    console.error("Dataverse API proxy error:", error);
    res.status(502).json({
      error: "Failed to proxy request to Dataverse API",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
