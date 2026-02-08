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
    const targetUrl = `${DATAVERSE_BASE_URL}${path}${req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : ""}`;

    // Prepare headers, excluding host to let Node handle it
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Pass through important headers from the request
    if (req.headers.authorization) {
      headers.authorization = req.headers.authorization;
    }
    if (req.headers["__requestverificationtoken"]) {
      headers["__requestverificationtoken"] = req.headers[
        "__requestverificationtoken"
      ] as string;
    }

    // Make the request to Dataverse API
    const proxyResponse = await fetch(targetUrl, {
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

    // Set response headers
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
