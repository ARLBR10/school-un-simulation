import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { api } from "@/convex/_generated/api";
import { fetchAuthQuery } from "@/lib/auth-server";

const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  documentUploader: f(
    {
      pdf: {
        maxFileSize: "8MB",
        maxFileCount: 1,
        minFileCount: 1,
        acl: "public-read", // private are not allowed in free tier!
      },
    },
    { awaitServerData: false },
  )
    .middleware(async () => {
      const userInfo = await fetchAuthQuery(api.auth.getCurrentUser, {});

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
