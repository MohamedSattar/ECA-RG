import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    open: "/index.html",
    proxy: {
      "/_api": {
        target: "https://research-grants-spa.powerappsportals.com/",
        changeOrigin: true,
        secure: false,
        credentials: "include",
        onProxyReq: (proxyReq, req, res) => {
          // Pass through any authorization headers from the original request
          if (req.headers.authorization) {
            proxyReq.setHeader("Authorization", req.headers.authorization);
          }
          if (req.headers["__requestverificationtoken"]) {
            proxyReq.setHeader("__RequestVerificationToken", req.headers["__requestverificationtoken"]);
          }
        },
        onError: (err, req, res) => {
          console.error("Proxy error:", err);
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Proxy error", message: err.message }));
        },
      },
    },
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
    apply: "serve", // Only apply during development (serve mode)
    configureServer(server) {
      const app = createServer();
      //app.use('/_api', "https://site-9ziqk.powerappsportals.com/");
      // Add Express app as middleware to Vite dev server
       setTimeout(() => {
        server.middlewares.use(app);
      },3000);
    },
  };
}
