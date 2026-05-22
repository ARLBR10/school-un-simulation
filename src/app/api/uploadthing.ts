import { createFileRoute } from "@tanstack/react-router";
import { createRouteHandler } from "uploadthing/server";

import { ourFileRouter } from "@/src/server/uploadthing";
import { getServerEnv } from "@/src/server/env";

const convexSiteUrl = getServerEnv("VITE_CONVEX_SITE_URL");

if (!convexSiteUrl) {
  throw new Error(
    "VITE_CONVEX_SITE_URL is required for UploadThing callbacks",
  );
}

const uploadthingHandler = createRouteHandler({
  router: ourFileRouter,
  config: {
    callbackUrl: `${convexSiteUrl}/webhooks/uploadthing`,
    token: getServerEnv("UPLOADTHING_TOKEN"),
  },
});

export const Route = createFileRoute("/api/uploadthing")({
  server: {
    handlers: {
      GET: uploadthingHandler,
      POST: uploadthingHandler,
    },
  },
});
