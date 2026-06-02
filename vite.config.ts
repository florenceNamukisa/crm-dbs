import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [
    TanStackRouterVite({
      routesDirectory: "scr/routes",
      generatedRouteTree: "scr/routeTree.gen.ts",
    }),
    tailwindcss(),
    react(),
  ],
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./scr", import.meta.url)),
    },
  },
});
