import { api, components, internal } from "./_generated/api";
import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";
import { internalQuery, mutation } from "./_generated/server";
import { getPostHog } from "./posthog";
import uploadthing from "./uploadthing";

export const uploadthingSchema = ({
  name: v.string(),
  size: v.number(),
  key: v.string(),
  ufsUrl: v.string(),
  hash: v.string()
})

export const documentUploaded = mutation({
  args: {
    ...uploadthingSchema,
    type: v.union(v.literal("position_paper"))
  },
  async handler(ctx, args) {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser)

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
      member: userInfo.member.id,
      type: args.type,
      uploadthing: {
        name: args.name,
        size: args.size,
        hash: args.hash,
        key: args.key,
        ufsUrl: args.ufsUrl
      }
    })
    const jobId = await workflow.start(ctx, internal.documentAnalysis.documentAnalysisWorkflow, {
      documentId
    })

    await ctx.db.patch("docs", documentId, {
      aiAnalysis: {
        jobId
      }
    })
    return true
  },
})

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
      maxAttempts: 5
    }
  }
})

/**
 * The document Anaylsis should be a "standard" way of taking a PDF link and extracting it to MD (using Mistral OCR) then have a LLM (with a very strict system prompt) output a object with a score (through out each evaluating parameter) and maybe some observations.
 */
export const documentAnalysisWorkflow = workflow.define({
  args: {
    documentId: v.id("docs")
  },
  returns: v.any(), // Temp
  handler: async (step, args) => {
    const document = await step.runQuery(internal.documents.get, {
      documentId: args.documentId
    })
    const file = await uploadthing.getFile(step, {
      key: document!.uploadthing.key
    })

    
  }
})

export const get = internalQuery({
  args: {
    documentId: v.id("docs")
  },
  async handler(ctx, args) {
    return ctx.db.get("docs", args.documentId)
  },
})
