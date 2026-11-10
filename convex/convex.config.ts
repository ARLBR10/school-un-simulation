import { defineApp } from "convex/server";
import { v } from "convex/values";
import betterAuth from "@convex-dev/better-auth/convex.config";
import posthog from "@posthog/convex/convex.config.js";
import uploadthingFileTracker from "@mzedstudio/uploadthingtrack/convex.config.js";
import workflow from "@convex-dev/workflow/convex.config.js";
import migrations from "@convex-dev/migrations/convex.config.js";

const app = defineApp({
  env: {
    SITE_URL: v.string(),
    ALLOWED_DOMAIN: v.optional(v.string()),
    GOOGLE_CLIENT_ID: v.optional(v.string()),
    GOOGLE_CLIENT_SECRET: v.optional(v.string()),
    MISTRALAI_API_KEY: v.optional(v.string()),
    OPENROUTER_API_KEY: v.optional(v.string()),
    POSTHOG_API_KEY: v.string(),
    POSTHOG_HOST: v.optional(v.string()),
    CONVEX_DEPLOYMENT: v.optional(v.string()),
  },
});
app.use(betterAuth);
app.use(posthog, {
  env: {
    POSTHOG_PROJECT_TOKEN: app.env.POSTHOG_API_KEY,
    POSTHOG_HOST: app.env.POSTHOG_HOST,
  }
});
app.use(uploadthingFileTracker, { name: "uploadthingFileTracker" });
app.use(workflow);
app.use(migrations);

export default app;
