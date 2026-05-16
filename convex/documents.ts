import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";

import { api, components, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { getPostHog } from "./posthog";
import { uploadthingSchema } from "./uploadthing";
import type { OcrPage } from "@/lib/ocr";

export const documentUploaded = mutation({
  args: {
    ...uploadthingSchema,
    type: v.union(v.literal("position_paper")),
  },
  async handler(ctx, args) {
    // const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    // if (!userInfo) {
    //   await getPostHog().capture(ctx, {
    //     event: "unauthorized_upload",
    //     properties: {
    //       mutation: "documentAnalysis.uploadedCallback",
    //       type: "No userInfo provided.",
    //       dataReceived: args,
    //     },
    //   });
    //   return null;
    // } else if (!userInfo.member) {
    //   await getPostHog().capture(ctx, {
    //     event: "unauthorized_upload",
    //     properties: {
    //       mutation: "documentAnalysis.uploadedCallback",
    //       type: "No membership provided.",
    //       dataReceived: args,
    //     },
    //   });
    //   return null;
    // }

    const userInfo = {
      member: {
        _id: "jd75pgeghg73fpts0tv39gmhdn85xc78"
      }
    }

    const documentId = await ctx.db.insert("docs", {
      member: userInfo.member._id,
      type: args.type,
      uploadthing: {
        name: args.name,
        size: args.size,
        hash: args.hash,
        key: args.key,
        ufsUrl: args.ufsUrl,
      },
    });
    const jobId = await workflow.start(
      ctx,
      internal.documents.documentAnalysisWorkflow,
      {
        documentId,
      },
    );

    await ctx.db.patch("docs", documentId, {
      aiAnalysis: {
        jobId,
      },
    });
    return true;
  },
});

/**
 * Limits
 *
 * Openrouter Free models: 1000 request/day
 * Mistral AI: Until rate-limit reaches (its unknown...)
 */
export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    maxParallelism: 1, // This will be changed with time.
    defaultRetryBehavior: {
      initialBackoffMs: 10000,
      base: 2,
      maxAttempts: 5,
    },
  },
});

/**
 * The document Anaylsis should be a "standard" way of taking a PDF link and extracting it to MD (using Mistral OCR) then have a LLM (with a very strict system prompt) output a object with a score (through out each evaluating parameter) and maybe some observations.
 */
export const documentAnalysisWorkflow = workflow.define({
  args: {
    documentId: v.id("docs"),
  },
  returns: v.any(), // Temp
  handler: async (step, args) => {
    const document: Doc<"docs"> | null = await step.runQuery(
      internal.documents.get,
      {
        documentId: args.documentId,
      },
    );
    // Can't use Uploadthing Track for an "admin" view. Freaking stupid...

    if (!document) {
      throw new Error("Document was not found for analysis.");
    }

    const markdownPages: OcrPage[] = await step.runAction(
      internal.documentsActions.extractMd,
      {
        documentId: args.documentId,
        url: document.uploadthing.ufsUrl,
      },
    );

    console.log(markdownPages);

    const aiOutput = await step.runAction(internal.documentsActions.aisdkAnalysis, {
      documentId: args.documentId
    })
  },
});

export const get = internalQuery({
  args: {
    documentId: v.id("docs"),
  },
  async handler(ctx, args) {
    return ctx.db.get("docs", args.documentId);
  },
});

export const getDoc = internalQuery({
  args: {
    documentId: v.id("docs"),
  },
  async handler(ctx, args) {
    return ctx.db.get("docs", args.documentId);
  },
});

export const updateDocs = internalMutation({
  args: {
    documentId: v.id("docs"),
    aiAnalysis: v.object({
      markdown: v.optional(v.array(v.any())),
      scores: v.optional(v.any()),
      observations: v.optional(v.string()),
    }),
  },
  async handler(ctx, args) {
    const document = await ctx.db.get("docs", args.documentId);

    if (!document?.aiAnalysis?.jobId) {
      throw new Error("Document analysis job was not initialized.");
    }

    await ctx.db.patch("docs", args.documentId, {
      aiAnalysis: {
        ...document.aiAnalysis,
        ...args.aiAnalysis,
      },
    });
  },
});
