import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT ?? "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

const localModules = path.resolve(import.meta.dirname, "node_modules");

export default defineConfig(async ({ command }) => {
  const isServeInReplit = command === "serve" && process.env.REPL_ID !== undefined;

  const replitPlugins = isServeInReplit
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
    : [];

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...replitPlugins,
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
        "react": path.resolve(localModules, "react"),
        "react-dom": path.resolve(localModules, "react-dom"),
        "@tanstack/react-query": path.resolve(localModules, "@tanstack/react-query"),
      },
      dedupe: ["react", "react-dom", "@tanstack/react-query"],
    },
    optimizeDeps: {
      include: ["react", "react-dom", "@tanstack/react-query"],
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
      proxy: {
        "/api": {
          target: `http://localhost:${process.env.API_PORT ?? "8080"}`,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
