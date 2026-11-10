import { URL, fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

export default defineConfig({
  environments: {
    ssr: {
      resolve: {
        // Workerd cannot share externalized React with Vite's optimized modules.
        noExternal: true,
      },
      // Workerd needs CommonJS dependencies converted to ESM before evaluation.
      optimizeDeps: {
        noDiscovery: false,
        include: [
          "react",
          "react/jsx-runtime",
          "react/jsx-dev-runtime",
          "react-dom",
          "react-dom/server",
        ],
      },
    },
  },
  resolve: {
    // SSR dependencies and the renderer must share the same React instance.
    dedupe: ["react", "react-dom"],
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      srcDirectory: "src", // This is the default
      router: {
        // Specifies the directory TanStack Router uses for your routes.
        routesDirectory: "app", // Defaults to "routes", relative to srcDirectory
      },
      prerender: {
        enabled: false,
        filter: ({ path }) => path === "/terms" || path === "/privacy",
      },
    }),
    viteReact(),
    nitro()
  ],
});
