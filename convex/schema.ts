import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { memberTypes } from "./members";
import { countriesConvexSchema } from "@/lib/country-list";
import { uploadthingSchema } from "./uploadthing";
import { aiAnalysisStatusSchema } from "./documents";
import { eventStatuses } from "./events";

const gradingEntryKind = v.union(v.literal("grade"), v.literal("deduction"));
const attendanceStatus = v.union(
  v.literal("present"),
  v.literal("late"),
  v.literal("absent"),
);

export default defineSchema({
  events: defineTable({
    name: v.string(),
    slug: v.string(),
    year: v.number(),
    status: eventStatuses,
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_year", ["year"]),
  members: defineTable({
    userId: v.optional(v.string()), // IDs from others components don't count on convex/values. This is optional because the mtf could not be registered.
    name: v.string(),
    tuitionId: v.optional(v.string()),
    schoolClass: v.optional(v.string()),
    type: memberTypes,
    pressRole: v.optional(
      v.union(
        v.literal("writer"),
        v.literal("media"),
        v.literal("photographer"),
      ),
    ),
    delegatedCountry: v.optional(countriesConvexSchema), // @TODO: Be one of a big fat array of all the countries
    committee: v.optional(v.id("committees")),
    // Optional during the production backfill. Global admins intentionally omit it.
    eventId: v.optional(v.id("events")),
  })
    .index("by_userId", ["userId"])
    .index("by_tuitionId", ["tuitionId"])
    .index("by_type", ["type"])
    .index("by_committee", ["committee"])
    .index("by_delegatedCountry", ["delegatedCountry"])
    .index("by_eventId", { fields: ["eventId"], staged: true })
    .index("by_userId_and_eventId", {
      fields: ["userId", "eventId"],
      staged: true,
    })
    .index("by_tuitionId_and_eventId", {
      fields: ["tuitionId", "eventId"],
      staged: true,
    }),
  memberInvites: defineTable({
    member: v.id("members"),
    token: v.string(),
    expiresAt: v.number(),
    createdBy: v.string(),
  })
    .index("by_member", ["member"])
    .index("by_token", ["token"]),
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
    eventId: v.optional(v.id("events")),
  })
    .index("by_member", ["member"])
    .index("by_member_and_type", ["member", "type"])
    .index("by_eventId", { fields: ["eventId"], staged: true }),
  committees: defineTable({
    theme: v.string(),
    topics: v.array(v.string()),
    description: v.string(),
    eventId: v.optional(v.id("events")),
  }).index("by_eventId", { fields: ["eventId"], staged: true }),
  formSubmissions: defineTable({
    formKey: v.string(),
    formVersion: v.number(),
    respondentUserId: v.string(),
    respondentMemberId: v.id("members"),
    eventId: v.optional(v.id("events")),
    submittedAt: v.number(),
  })
    .index("by_formKey", ["formKey"])
    .index("by_respondentUserId", ["respondentUserId"])
    .index("by_respondentMemberId", ["respondentMemberId"])
    .index("by_formKey_and_formVersion_and_respondentUserId", [
      "formKey",
      "formVersion",
      "respondentUserId",
    ])
    .index("by_eventId", ["eventId"]),
  formAnswers: defineTable({
    submissionId: v.id("formSubmissions"),
    fieldId: v.string(),
    fieldName: v.string(),
    displayValue: v.string(),
    value: v.union(
      v.string(),
      v.number(),
      v.boolean(),
      v.array(v.string()),
    ),
  })
    .index("by_submissionId", ["submissionId"])
    .index("by_submissionId_and_fieldId", ["submissionId", "fieldId"]),
  news: defineTable({
    author: v.optional(v.id("members")),
    committee: v.optional(v.array(v.id("committees"))),
    title: v.string(),
    body: v.string(), // Markdown
    approvalStatus: v.optional(
      v.union(v.literal("pending"), v.literal("approved"), v.literal("denied")),
    ),
    reviewedBy: v.optional(v.id("members")),
    reviewedAt: v.optional(v.number()),
    denialReason: v.optional(v.string()),
    eventId: v.optional(v.id("events")),
  })
    .index("by_author", ["author"])
    .index("by_approvalStatus", ["approvalStatus"])
    .index("by_eventId", { fields: ["eventId"], staged: true }),
  gradingEntries: defineTable({
    member: v.id("members"),
    kind: gradingEntryKind,
    category: v.string(),
    amount: v.number(),
    note: v.optional(v.string()),
    eventId: v.optional(v.id("events")),
  })
    .index("by_member", ["member"])
    .index("by_kind", ["kind"])
    .index("by_member_and_kind", ["member", "kind"])
    .index("by_member_and_kind_and_category", ["member", "kind", "category"])
    .index("by_eventId", { fields: ["eventId"], staged: true }),
  attendanceEntries: defineTable({
    member: v.id("members"),
    committee: v.id("committees"),
    dateKey: v.string(),
    status: attendanceStatus,
    note: v.optional(v.string()),
    updatedAt: v.number(),
    eventId: v.optional(v.id("events")),
  })
    .index("by_member_and_dateKey", ["member", "dateKey"])
    .index("by_dateKey", ["dateKey"])
    .index("by_dateKey_and_committee", ["dateKey", "committee"])
    .index("by_eventId", { fields: ["eventId"], staged: true }),
});
