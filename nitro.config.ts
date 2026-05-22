import { defineConfig } from "nitro";

const publicWorkerVars = Object.fromEntries(
  [
    "VITE_CONVEX_URL",
    "VITE_CONVEX_SITE_URL",
    "VITE_SITE_URL",
    "VITE_POSTHOG_KEY",
    "VITE_POSTHOG_HOST",
  ]
    .map((name) => [name, process.env[name]])
    .filter((entry): entry is [string, string] => Boolean(entry[1])),
);

export default defineConfig({
  compatibilityDate: "2026-05-21",
  preset: "cloudflare_module",
  cloudflare: {
    wrangler: {
      name: "school-un-simulation",
      observability: {
        enabled: true,
      },
      vars: publicWorkerVars,
    },
    deployConfig: true,
    nodeCompat: true,
  },
});
