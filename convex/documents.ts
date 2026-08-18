import { WorkflowManager } from "@convex-dev/workflow";
import { v } from "convex/values";

import { api, components, internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getPostHog } from "./posthog";
import {
  getOperationalEventId,
  isEventInOperationalScope,
  resolveEventId,
} from "./events";
import { uploadthingSchema } from "./uploadthing";
import { hasDocumentAnalysisConfig } from "@/lib/document-config";

type DocumentPatch = Partial<
  Pick<Doc<"docs">, "eventId" | "member" | "type" | "uploadthing">
>;

export type UploadedDocumentListItem = {
  document: Doc<"docs">;
  member: Doc<"members"> | null;
};

export const documentTypes = v.union(
  v.literal("position_paper"),
  v.literal("final_resolution"),
);

export const aiAnalysisStatusSchema = v.object({
  ocrProcessed: v.optional(v.nullable(v.boolean())),
  llmReviewFailed: v.optional(v.boolean()),
  llmReviewed: v.optional(v.boolean()), // An request can fail so we need to know if the review worked or not.
  requiresHumanReview: v.optional(v.boolean()),
});

export const documentUploaded = mutation({
  args: {
    ...uploadthingSchema,
    type: documentTypes,
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

    const member = userInfo.member;

    if (args.type === "position_paper") {
      const existingPositionPaper = await ctx.db
        .query("docs")
        .withIndex("by_member_and_type", (q) =>
          q.eq("member", member._id).eq("type", "position_paper"),
        )
        .take(1);

      if (existingPositionPaper.length > 0) {
        return null;
      }
    }

    const documentId = await ctx.db.insert("docs", {
      member: member._id,
      eventId: await resolveEventId(ctx, member.eventId),
      type: args.type,
      uploadthing: {
        name: args.name,
        size: args.size,
        hash: args.hash,
        key: args.key,
        ufsUrl: args.ufsUrl,
        mimeType: args.mimeType,
      },
    });

    if (hasDocumentAnalysisConfig(args.type)) {
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
        },
      });
    }
    return true;
  },
});

export const getMyPositionPaper = query({
  args: {},
  async handler(ctx): Promise<Doc<"docs"> | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (!userInfo?.member) {
      return null;
    }

    const member = userInfo.member;

    const documents = await ctx.db
      .query("docs")
      .withIndex("by_member_and_type", (q) =>
        q.eq("member", member._id).eq("type", "position_paper"),
      )
      .order("desc")
      .take(1);

    return documents[0] ?? null;
  },
});

export const submitPositionPaper = mutation({
  args: uploadthingSchema,
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (!userInfo?.member || userInfo.member.type !== "delegate") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "documents.submitPositionPaper",
          user_type_required: "delegate",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const member = userInfo.member;

    const existingPositionPaper = await ctx.db
      .query("docs")
      .withIndex("by_member_and_type", (q) =>
        q.eq("member", member._id).eq("type", "position_paper"),
      )
      .take(1);

    if (existingPositionPaper.length > 0) {
      return false;
    }

    const documentId = await ctx.db.insert("docs", {
      member: member._id,
      eventId: await resolveEventId(ctx, member.eventId),
      type: "position_paper",
      uploadthing: {
        name: args.name,
        size: args.size,
        hash: args.hash,
        key: args.key,
        ufsUrl: args.ufsUrl,
        mimeType: args.mimeType,
      },
    });

    const jobId = await workflow.start(ctx, internal.documents.documentAnalysisWorkflow, {
      documentId,
    });

    await ctx.runMutation(internal.documents.updateDocs, {
      documentId,
      aiAnalysis: {
        jobId,
        job_status: {},
      },
    });

    await getPostHog().capture(ctx, {
      event: "delegate_submit_position_paper",
      properties: {
        member: member._id,
        uploadthingKey: args.key,
      },
    });

    return true;
  },
});

export const getAll = query({
  args: {},
  async handler(ctx): Promise<Doc<"docs">[] | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type !== "admin") {
      return null;
    }

    return await ctx.db.query("docs").order("desc").take(999);
  },
});

export const getAllForOperation = query({
  args: {},
  async handler(ctx): Promise<UploadedDocumentListItem[] | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);
    const memberType = userInfo?.member?.type;

    if (
      memberType !== "admin" &&
      memberType !== "logistics" &&
      memberType !== "clerk"
    ) {
      return null;
    }

    const operationalEventId = userInfo?.member
      ? await getOperationalEventId(ctx, userInfo.member)
      : null;
    if (!operationalEventId) return null;
    const candidates = await ctx.db.query("docs").order("desc").take(999);
    const documents: Doc<"docs">[] = [];
    for (const document of candidates) {
      if (
        await isEventInOperationalScope(
          ctx,
          document.eventId,
          operationalEventId,
        )
      ) {
        documents.push(document);
      }
    }

    return await Promise.all(
      documents.map(async (document) => ({
        document,
        member: await ctx.db.get("members", document.member),
      })),
    );
  },
});

export const create = mutation({
  args: {
    member: v.id("members"),
    type: documentTypes,
    ...uploadthingSchema,
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type !== "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "documents.create",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const member = await ctx.db.get("members", args.member);

    if (!member) {
      return null;
    }

    await ctx.db.insert("docs", {
      member: args.member,
      eventId: await resolveEventId(ctx, member.eventId),
      type: args.type,
      uploadthing: {
        name: args.name,
        size: args.size,
        hash: args.hash,
        key: args.key,
        ufsUrl: args.ufsUrl,
        mimeType: args.mimeType,
      },
    });

    await getPostHog().capture(ctx, {
      event: "admin_create_document",
      properties: {
        member: args.member,
        type: args.type,
        uploadthingKey: args.key,
      },
    });

    return true;
  },
});

export const update = mutation({
  args: {
    id: v.id("docs"),
    member: v.optional(v.id("members")),
    type: v.optional(documentTypes),
    uploadthing: v.optional(v.object(uploadthingSchema)),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type !== "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "documents.update",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const document = await ctx.db.get("docs", args.id);

    if (!document) {
      return null;
    }

    const documentPatch: DocumentPatch = {};

    if (args.member !== undefined) {
      const member = await ctx.db.get("members", args.member);

      if (!member) {
        return null;
      }

      documentPatch.member = args.member;
      documentPatch.eventId = await resolveEventId(ctx, member.eventId);
    }

    if (args.type !== undefined) {
      documentPatch.type = args.type;
    }

    if (args.uploadthing !== undefined) {
      documentPatch.uploadthing = args.uploadthing;
    }

    await ctx.db.patch("docs", args.id, documentPatch);

    await getPostHog().capture(ctx, {
      event: "admin_update_document",
      properties: {
        id: args.id,
        dataReceived: args,
      },
    });

    return true;
  },
});

export const purge = mutation({
  args: {
    id: v.id("docs"),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type !== "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "documents.purge",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    await ctx.db.delete("docs", args.id);
    await getPostHog().capture(ctx, {
      event: "admin_delete_document",
      properties: {
        id: args.id,
      },
    });
    return true;
  },
});

export const rerunAnalysis = mutation({
  args: {
    id: v.id("docs"),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type !== "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "documents.rerunAnalysis",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const document = await ctx.db.get("docs", args.id);

    if (!document || !hasDocumentAnalysisConfig(document.type)) {
      return null;
    }

    const currentAnalysis = document.aiAnalysis;
    const currentAnalysisFinished = Boolean(
      currentAnalysis?.job_status?.llmReviewed ||
        currentAnalysis?.job_status?.llmReviewFailed ||
        currentAnalysis?.scores ||
        currentAnalysis?.observations,
    );

    if (currentAnalysis?.jobId && !currentAnalysisFinished) {
      return null;
    }

    const jobId = await workflow.start(
      ctx,
      internal.documents.documentAnalysisWorkflow,
      {
        documentId: args.id,
      },
    );

    await ctx.db.patch("docs", args.id, {
      aiAnalysis: {
        jobId,
        job_status: {},
      },
    });

    await getPostHog().capture(ctx, {
      event: "admin_rerun_document_analysis",
      properties: {
        id: args.id,
        type: document.type,
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
        fileName: document.uploadthing.name,
        mimeType: document.uploadthing.mimeType,
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
