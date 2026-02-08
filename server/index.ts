import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";

const DATAVERSE_BASE_URL = "https://research-grants-spa.powerappsportals.com";

async function handleDataverseProxy(req: express.Request, res: express.Response) {
  res.status(501).json({ message: "Proxy endpoint - not yet implemented" });
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
  app.all("/api/dataverse/*", handleDataverseProxy);

  return app;
}
