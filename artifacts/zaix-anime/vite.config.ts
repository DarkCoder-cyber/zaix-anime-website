import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

// Resolve to the single canonical copy of each shared package so that
// workspace sub-packages (e.g. api-client-react) never load a second instance.
const localModules = path.resolve(import.meta.dirname, "node_modules");

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      // Force every import of these packages — including those coming from
      // workspace libs — to resolve to exactly one module instance.
      "react": path.resolve(localModules, "react"),
      "react-dom": path.resolve(localModules, "react-dom"),
      "@tanstack/react-query": path.resolve(localModules, "@tanstack/react-query"),
    },
    dedupe: ["react", "react-dom", "@tanstack/react-query"],
  },
  optimizeDeps: {
    // Include the workspace library so Vite pre-bundles it together with the
    // rest of the app, sharing the same React/react-query instances.
    include: [
      "react",
      "react-dom",
      "@tanstack/react-query",
    ],
    // Exclude workspace source packages from pre-bundling; Vite transpiles
    // them inline using the aliases above.
    exclude: ["@workspace/api-client-react"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.API_PORT ?? "8080"}`,
        changeOrigin: true,
        secure: false,
      },
    },
    fs: {
      strict: true,
      // Allow Vite to serve workspace library source files (e.g. api-client-react)
      // which live outside the artifact root but are imported via node_modules symlinks.
      allow: [
        path.resolve(import.meta.dirname),
        path.resolve(import.meta.dirname, "..", "..", "lib"),
        path.resolve(import.meta.dirname, "..", "..", "node_modules"),
        localModules,
      ],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
