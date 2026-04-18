import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";

// API Base URL - sourced from environment variables
const API_BASE_URL = process.env.VITE_PUBLIC_API_BASE_URL || "";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    open: "/index.html",
  },
  optimizeDeps: {
    exclude: ["express"],
  },
  build: {
    outDir: "dist/spa",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          "fluentui-react": [
            "@fluentui/react/lib/Button",
            "@fluentui/react/lib/TextField",
            "@fluentui/react/lib/Label",
            "@fluentui/react/lib/Dropdown",
            "@fluentui/react/lib/DatePicker",
            "@fluentui/react/lib/Dialog",
          ],
          "fluentui-theme": [
            "@fluentui/react/lib/Theme",
            "@fluentui/react/lib/Icons",
          ],
          "fluentui-utilities": ["@fluentui/react/lib/Utilities"],
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          msal: ["@azure/msal-browser", "@azure/msal-react"],
        },
      },
    },
  },
  plugins: [react(), expressPlugin()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  return {
    name: "express-plugin",
    apply: "serve",
    configureServer(server) {
      // Re-create the Express app on every relevant server file change so that
      // access-control logic and route changes are always live in dev.
      let expressApp = createServer();

      server.watcher.on("change", (filePath) => {
        if (filePath.includes(`${path.sep}server${path.sep}`)) {
          // Invalidate the module cache entry so createServer() re-evaluates
          Object.keys(require.cache ?? {}).forEach((key) => {
            if (key.includes(`${path.sep}server${path.sep}`)) {
              delete (require.cache as any)[key];
            }
          });
          try {
            expressApp = createServer();
          } catch (err) {}
        }
      });

      // Add middleware to handle proxy routes FIRST (before Vite's fallback)
      server.middlewares.use((req, res, next) => {
        if (
          req.url?.startsWith("/_api") ||
          req.url?.startsWith("/_layout") ||
          req.url?.startsWith("/api/")
        ) {
          expressApp(req as any, res as any, next);
        } else {
          next();
        }
      });
    },
  };
}
