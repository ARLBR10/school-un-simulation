import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { memberTypes } from "./members";
import { countriesConvexSchema } from "@/lib/country-list";
import { uploadthingSchema } from "./uploadthing";
import { aiAnalysisStatusSchema } from "./documents";

const gradingEntryKind = v.union(v.literal("grade"), v.literal("deduction"));
const attendanceStatus = v.union(v.literal("present"), v.literal("absent"));

export default defineSchema({
  members: defineTable({
    userId: v.optional(v.string()), // IDs from others components don't count on convex/values. This is optional because the mtf could not be registered.
    name: v.string(),
    tuitionId: v.optional(v.string()),
    type: memberTypes,
    delegatedCountry: v.optional(countriesConvexSchema), // @TODO: Be one of a big fat array of all the countries
    committee: v.optional(v.id("committees")),
  })
    .index("by_userId", ["userId"])
    .index("by_tuitionId", ["tuitionId"])
    .index("by_type", ["type"])
    .index("by_committee", ["committee"])
    .index("by_delegatedCountry", ["delegatedCountry"]),
  docs: defineTable({
    member: v.id("members"),
    type: v.union(
      v.literal("position_paper"), // AKA: Documento de Posição Oficial (DPO)
      v.literal("final_resolution"),
      v.string(), // Less headache?
    ),
    uploadthing: v.object(uploadthingSchema),
    aiAnalysis: v.optional(
      v.object({
        jobId: v.string(),
        job_status: v.optional(aiAnalysisStatusSchema),
        markdown: v.optional(v.array(v.any())),
        scores: v.optional(v.any()),
        observations: v.optional(v.string()),
      }),
    ),
  })
    .index("by_member", ["member"])
    .index("by_member_and_type", ["member", "type"]),
  committees: defineTable({
    theme: v.string(),
    topics: v.array(v.string()),
    description: v.string(),
  }),
  news: defineTable({
    author: v.optional(v.id("members")),
    committee: v.optional(v.array(v.id("committees"))),
    title: v.string(),
    body: v.string(), // Markdown
  }),
  gradingEntries: defineTable({
    member: v.id("members"),
    kind: gradingEntryKind,
    category: v.string(),
    amount: v.number(),
    note: v.optional(v.string()),
  })
    .index("by_member", ["member"])
    .index("by_kind", ["kind"])
    .index("by_member_and_kind", ["member", "kind"])
    .index("by_member_and_kind_and_category", ["member", "kind", "category"]),
  attendanceEntries: defineTable({
    member: v.id("members"),
    committee: v.id("committees"),
    dateKey: v.string(),
    status: attendanceStatus,
    note: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_member_and_dateKey", ["member", "dateKey"])
    .index("by_dateKey", ["dateKey"])
    .index("by_dateKey_and_committee", ["dateKey", "committee"]),
});
