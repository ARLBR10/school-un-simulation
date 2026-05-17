import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";

import { api, components, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, internalQuery, mutation } from "./_generated/server";
import { getPostHog } from "./posthog";
import { uploadthingSchema } from "./uploadthing";

export const aiAnalysisStatusSchema = v.object({
  ocrProcessed: v.optional(v.nullable(v.boolean())),
  llmReviewFailed: v.optional(v.boolean()),
  llmReviewed: v.optional(v.boolean()), // An request can fail so we need to know if the review worked or not.
  requiresHumanReview: v.optional(v.boolean()),
});

export const documentUploaded = mutation({
  args: {
    ...uploadthingSchema,
    type: v.union(v.literal("position_paper")),
  },
  async handler(ctx, args) {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (!userInfo) {
      await getPostHog().capture(ctx, {
        event: "unauthorized_upload",
        properties: {
          mutation: "documentAnalysis.uploadedCallback",
          type: "No userInfo provided.",
          dataReceived: args,
        },
      });
      return null;
    } else if (!userInfo.member) {
      await getPostHog().capture(ctx, {
        event: "unauthorized_upload",
        properties: {
          mutation: "documentAnalysis.uploadedCallback",
          type: "No membership provided.",
          dataReceived: args,
        },
      });
      return null;
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

    await ctx.runMutation(internal.documents.updateDocs, {
      documentId,
      aiAnalysis: {
        jobId,
        job_status: {},
      }
    })
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
  handler: async (step, args): Promise<any> => {
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
    
    if (!document.aiAnalysis?.markdown) {
      await step.runAction(internal.documentsActions.extractMd, {
        documentId: args.documentId,
        url: document.uploadthing.ufsUrl,
      });
      await step.runMutation(internal.documents.updateDocs, {
        documentId: args.documentId,
        aiAnalysis: {
          job_status: {
            ocrProcessed: true,
          },
        },
      })
    }

    const aiOutput = await step.runAction(
      internal.documentsActions.aisdkAnalysis,
      {
        documentId: args.documentId,
      },
    );
    await step.runMutation(internal.documents.updateDocs, {
      documentId: args.documentId,
      aiAnalysis: {
        job_status: {
          llmReviewFailed: false,
          llmReviewed: true,
          requiresHumanReview: aiOutput.needs_human_review,
        },
        scores: aiOutput.params,
        observations: aiOutput.observations ?? undefined,
      },
    });

    return aiOutput
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

export const updateDocs = internalMutation({
  args: {
    documentId: v.id("docs"),
    aiAnalysis: v.object({
      jobId: v.optional(v.string()),
      job_status: v.optional(aiAnalysisStatusSchema),
      markdown: v.optional(v.array(v.any())),
      scores: v.optional(v.any()),
      observations: v.optional(v.string()),
    }),
  },
  async handler(ctx, args) {
    const document = await ctx.db.get("docs", args.documentId);
    const currentAiAnalysis = document?.aiAnalysis;
    const jobId = args.aiAnalysis.jobId ?? currentAiAnalysis?.jobId;

    if (!document) {
      throw new Error("Document was not found for update.");
    }

    if (!jobId) {
      throw new Error("Document analysis job was not initialized.");
    }

    await ctx.db.patch("docs", args.documentId, {
      aiAnalysis: {
        ...currentAiAnalysis,
        ...args.aiAnalysis,
        jobId,
        job_status: args.aiAnalysis.job_status
          ? {
              ...currentAiAnalysis?.job_status,
              ...args.aiAnalysis.job_status,
            }
          : currentAiAnalysis?.job_status,
      },
    });
  },
});
