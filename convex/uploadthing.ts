import { UploadThingFiles } from "@mzedstudio/uploadthingtrack";
import { components } from "./_generated/api";
import { v } from "convex/values";

const uploadthing = new UploadThingFiles(components.uploadthingFileTracker);

export default uploadthing

export const uploadthingSchema = {
  name: v.string(),
  size: v.number(),
  key: v.string(),
  ufsUrl: v.string(),
  hash: v.string(),
};