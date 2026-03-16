import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function normalizeBasePath(value?: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed || trimmed === "/") {
    return "/";
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${withLeadingSlash.replace(/\/+$/g, "")}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const appBasePath = normalizeBasePath(env.APP_BASE_PATH || env.VITE_APP_BASE_PATH);
  const apiProxyPath = `${appBasePath === "/" ? "" : appBasePath.slice(0, -1)}/api`;

  return {
    base: appBasePath,
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        [apiProxyPath]: {
          target: env.VITE_DEV_API_TARGET || "http://localhost:8787",
          changeOrigin: true
        }
      }
    },
    preview: {
      port: 4173
    }
  };
});
