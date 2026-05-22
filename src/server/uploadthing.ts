import { ConvexHttpClient } from "convex/browser";
import { UploadThingError, createUploadthing } from "uploadthing/server";
import { getToken } from "@convex-dev/better-auth/utils";

import type { FileRouter } from "uploadthing/server";

import { api } from "@/convex/_generated/api";
import { getServerEnv } from "@/src/server/env";

const f = createUploadthing();

function getUploadThingAuthEnv() {
  const convexSiteUrl = getServerEnv("VITE_CONVEX_SITE_URL");
  const convexUrl = getServerEnv("VITE_CONVEX_URL");

  if (!convexSiteUrl) {
    throw new Error(
      "VITE_CONVEX_SITE_URL is required for UploadThing authentication",
    );
  }

  if (!convexUrl) {
    throw new Error(
      "VITE_CONVEX_URL is required for UploadThing authentication",
    );
  }

  return { convexSiteUrl, convexUrl };
}

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  documentUploader: f(
    {
      pdf: {
        maxFileSize: "8MB",
        maxFileCount: 1,
        minFileCount: 0,
        acl: "public-read", // private are not allowed in free tier!
      },
      image: {
        maxFileSize: "8MB",
        maxFileCount: 1,
        minFileCount: 0,
        acl: "public-read", // private are not allowed in free tier!
      },
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
        maxFileSize: "8MB",
        maxFileCount: 1,
        minFileCount: 0,
        acl: "public-read", // private are not allowed in free tier!
      },
    },
    { awaitServerData: false },
  )
    .middleware(async ({ req }) => {
      const { convexSiteUrl, convexUrl } = getUploadThingAuthEnv();
      const headers = new Headers(req.headers);
      const { token } = await getToken(convexSiteUrl, headers);
      const convex = new ConvexHttpClient(convexUrl);

      if (token) {
        convex.setAuth(token);
      }

      const userInfo = await convex.query(api.auth.getCurrentUser, {});

      if (!userInfo) {
        throw new UploadThingError("Unauthorized");
      }

      return {
        userId: userInfo._id,
        folder: "documents",
        tags: ["document"],
        fileType: "document",
        access: { visibility: "private" as const },
      };
    })
    .onUploadComplete(async () => {}),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
