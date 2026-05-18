import { createRouteHandler } from "uploadthing/next";

import { ourFileRouter } from "./core";

const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

if (!convexSiteUrl) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_SITE_URL is required for UploadThing callbacks",
  );
}

// The route can't have POST, because that route is used for UploadThing Webhook
export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  config: {
    callbackUrl: `${convexSiteUrl}/webhooks/uploadthing`,
    token: process.env.UPLOADTHING_TOKEN,
  },
});
