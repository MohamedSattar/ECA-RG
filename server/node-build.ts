import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "./index.js"; // ensure .js if ESM
import express from "express";

const app = createServer();
const port = process.env.PORT || 3000;

// Properly get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to your built SPA folder relative to this file
const distPath = path.resolve(__dirname, "../spa");

// Serve static files from SPA build folder
app.use(express.static(distPath));

// Handle React Router — serve index.html for all non-API requests
app.use((req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/health")) {
    return res.status(404).json({ error: "API endpoint not found" });
  }

  const indexFile = path.join(distPath, "index.html");

  // Optional: verify index.html exists to catch deployment errors
  import("fs")
    .then((fs) => {
      if (!fs.existsSync(indexFile)) {
        return res.status(500).send("SPA index.html not found");
      }
      res.sendFile(indexFile);
    })
    .catch((err) => {
      res.status(500).send("Internal Server Error");
    });
});

app.listen(port);

// Graceful shutdown handling
["SIGTERM", "SIGINT"].forEach((sig) => {
  process.on(sig, () => {
    process.exit(0);
  });
});
