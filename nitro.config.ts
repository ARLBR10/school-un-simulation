import { defineConfig } from "nitro";

export default defineConfig({
  compatibilityDate: "2026-05-21",
  preset: "cloudflare_module",
  cloudflare: {
    wrangler: {
      name: "school-un-simulation",
      observability: {
        enabled: true,
      },
    },
    deployConfig: true,
    nodeCompat: true,
  },
});
