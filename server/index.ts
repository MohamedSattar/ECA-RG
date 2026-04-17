import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleAuthSession } from "./routes/authSession";
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
import { loadSession, requireContactSession } from "./middleware/sessionAuth";
import { runDataverseProxy } from "./proxy/runDataverseProxy";
import { getDataverseToken } from "./dataverseClient";
import { assertCanAccessPrivateRecord } from "./proxy/ownershipPreflight";
import { PUBLIC_ENTITY_SETS } from "./proxy/dataversePolicy";
const DATAVERSE_BASE_URL =
  process.env.DATAVERSE_BASE_URL ||
  (process.env.DATAVERSE_RESOURCE
    ? process.env.DATAVERSE_RESOURCE.replace(/\/\.default\/?$/, "")
    : "https://eca.crm15.dynamics.com");

export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", message: "Server is running" });
  });

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  app.post("/api/auth/session", handleAuthSession);

  app.get("/api/budget/headers", loadSession, requireContactSession, getBudgetHeadersByApplication);
  app.get("/api/budget/headers/:id", loadSession, requireContactSession, getBudgetHeader);
  app.post("/api/budget/headers", loadSession, requireContactSession, createBudgetHeaderRoute);
  app.get("/api/budget/line-items", loadSession, requireContactSession, getBudgetLineItems);
  app.post("/api/budget/line-items", loadSession, requireContactSession, createBudgetLineItem);
  app.patch("/api/budget/line-items/:id", loadSession, requireContactSession, updateBudgetLineItem);
  app.delete("/api/budget/line-items/:id", loadSession, requireContactSession, deleteBudgetLineItem);
  app.get("/api/budget/spends", loadSession, requireContactSession, getBudgetSpendsByLineItem);
  app.post("/api/budget/spends/bulk", loadSession, requireContactSession, upsertBudgetSpends);

  const isDev = process.env.NODE_ENV !== "production";
  const FALLBACK_TOKEN = isDev
    ? "H2mPseS4jqMjdACQIcTLuZYge-isZjkr_Pj37loAqcjZb6dp4bIZao9TZqN2uvXmMVwTGvkFsTtq5tnfPGfoCj2U15FDO8T8ESjcSTfguKw1"
    : "";

  app.get("/api/verification-token", async (_req, res) => {
    res.setHeader("Content-Type", "application/json");

    try {
      if (!DATAVERSE_BASE_URL) {
        if (!isDev) {
          return res.status(503).json({ token: null, available: false, error: "DATAVERSE_BASE_URL not configured" });
        }
        return res.json({ token: FALLBACK_TOKEN, available: true, source: "fallback" });
      }

      let tokenUrl: string;
      try {
        const baseUrl = new URL(DATAVERSE_BASE_URL);
        tokenUrl = `${baseUrl.protocol}//${baseUrl.host}/_layout/tokenhtml`;
      } catch (urlErr) {
        if (!isDev) {
          return res.status(503).json({ token: null, available: false, error: "Invalid DATAVERSE_BASE_URL" });
        }
        return res.json({ token: FALLBACK_TOKEN, available: true, source: "fallback" });
      }

      const response = await fetch(tokenUrl, {
        credentials: "include",
        cache: "no-cache",
      });

      if (!response.ok) {
        if (!isDev) {
          return res.status(502).json({ token: null, available: false, status: response.status });
        }
        return res.json({ token: FALLBACK_TOKEN, available: true, source: "fallback", status: response.status });
      }

      const text = await response.text();
      let token: string | null = null;
      let match = text.match(/name=["']__RequestVerificationToken["'][^>]*value=["']([^"']+)/i);
      if (match?.[1]) token = match[1];
      if (!token) {
        match = text.match(/value=["']([^"']+)[^>]*name=["']__RequestVerificationToken["']/i);
        if (match?.[1]) token = match[1];
      }
      if (!token) {
        match = text.match(/__RequestVerificationToken["\s:=]*["']?([A-Za-z0-9_+/=\-]+)/);
        if (match?.[1]) token = match[1];
      }

      if (token && token.length > 0) {
        return res.json({ token, available: true, source: "fetched" });
      }
      if (!isDev) {
        return res.status(502).json({ token: null, available: false, error: "Token not found in portal response" });
      }
      return res.json({ token: FALLBACK_TOKEN, available: true, source: "fallback" });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!isDev) {
        return res.status(502).json({ token: null, available: false, error: msg });
      }
      return res.json({ token: FALLBACK_TOKEN, available: true, source: "fallback", error: msg });
    }
  });

  app.get("/api/dataverse-image", loadSession, async (req, res) => {
    const rawUrl = typeof req.query.url === "string" ? req.query.url : null;
    const forceFullImage = String(req.query.full || "").toLowerCase() === "true";

    if (!rawUrl) {
      return res.status(400).json({ error: "Missing image url" });
    }

    if (!DATAVERSE_BASE_URL) {
      return res.status(500).json({ error: "DATAVERSE_BASE_URL is not configured" });
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

      const entitySetMap: Record<string, string> = {
        prmtk_researcharea: "prmtk_researchareas",
      };
      const entitySetName = entitySetMap[entity] || `${entity}s`;
      const entitySetLc = entitySetName.toLowerCase();

      if (!PUBLIC_ENTITY_SETS.has(entitySetLc)) {
        const session = req.sessionClaims;
        if (!session?.contactId) {
          return res.status(401).json({ error: "Authentication required" });
        }
        const ok = await assertCanAccessPrivateRecord(
          entitySetName,
          entitySetLc,
          recordId,
          session,
        );
        if (!ok) {
          return res.status(403).json({ error: "Forbidden" });
        }
      }

      const imagePath = `/api/data/v9.2/${entitySetName}(${recordId})/${attribute}/$value${forceFullImage ? "?size=full" : ""}`;

      const serverToken = await getDataverseToken();
      if (!serverToken) {
        return res.status(503).json({ error: "Server-side Dataverse token unavailable" });
      }

      const response = await fetch(baseUrl.origin + imagePath, {
        headers: {
          Authorization: `Bearer ${serverToken}`,
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });

      res.status(response.status);

      const imageBuffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type");
      const inferredContentType =
        contentType && contentType !== "application/octet-stream"
          ? contentType
          : imageBuffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
            ? "image/png"
            : imageBuffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
              ? "image/jpeg"
              : imageBuffer.subarray(0, 6).toString("ascii") === "GIF87a" || imageBuffer.subarray(0, 6).toString("ascii") === "GIF89a"
                ? "image/gif"
                : imageBuffer.subarray(0, 4).toString("ascii") === "RIFF" && imageBuffer.subarray(8, 12).toString("ascii") === "WEBP"
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[DataverseImage] Failed to proxy image:", err);
      return res.status(502).json({
        error: "Image proxy error",
        details: msg,
      });
    }
  });

  app.all(/^\/((_api|_layout)\/)/, (req, res) => {
    void runDataverseProxy(req, res);
  });

  return app;
}
