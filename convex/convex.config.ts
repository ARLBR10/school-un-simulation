import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";
import posthog from "@posthog/convex/convex.config.js";
import uploadthingFileTracker from "@mzedstudio/uploadthingtrack/convex.config.js";
import workflow from "@convex-dev/workflow/convex.config.js";

const app = defineApp();
app.use(betterAuth);
app.use(posthog);
app.use(uploadthingFileTracker, { name: "uploadthingFileTracker" });
app.use(workflow);

export default app;