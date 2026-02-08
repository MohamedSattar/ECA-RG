import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";

// API Base URL - sourced from environment variables
const API_BASE_URL = process.env.VITE_PUBLIC_API_BASE_URL || 'https://research-grants-spa.powerappsportals.com';

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
  let expressApp: any;

  return {
    name: "express-plugin",
    apply: "serve",
    configureServer(server) {
      expressApp = createServer();

      // Use pre middleware hook to add Express before Vite's own handlers
      return () => {
        // Insert Express as the first middleware (before Vite's fallback)
        const originalUse = server.middlewares.use.bind(server.middlewares);
        const wrappedUse = function(fn: any) {
          // Intercept and handle _api and _layout routes with our Express app
          originalUse((req: any, res: any, next: any) => {
            if (req.url.startsWith("/_api") || req.url.startsWith("/_layout")) {
              console.log(`[Vite] Proxying to Express: ${req.method} ${req.url}`);
              expressApp(req, res, next);
            } else {
              next();
            }
          });
          return originalUse(fn);
        };
        server.middlewares.use = wrappedUse as any;
      };
    },
  };
}
