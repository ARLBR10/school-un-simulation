import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getToken } from "@convex-dev/better-auth/utils";
import { fetchQuery } from "convex/nextjs";

import { api } from "@/convex/_generated/api";

const f = createUploadthing();
const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL;

if (!convexSiteUrl) {
  throw new Error(
    "NEXT_PUBLIC_CONVEX_SITE_URL is required for UploadThing authentication",
  );
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
      const headers = new Headers(req.headers);
      const { token } = await getToken(convexSiteUrl, headers);
      const userInfo = await fetchQuery(api.auth.getCurrentUser, {}, { token });

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
