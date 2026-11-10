import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { memberTypes } from "./members";
import { countriesConvexSchema } from "@/lib/country-list";
import { uploadthingSchema } from "./uploadthing";
import { aiAnalysisStatusSchema } from "./documents";
import { eventKinds, eventStatuses } from "./events";
import {
  theaterFactionColors,
  theaterMarkerCategories,
  theaterMarkerConcealments,
  theaterMarkerVisibilities,
  theaterOrderClassifications,
  theaterOrderStatuses,
} from "./theater";

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
    // Optional only until `backfillEventKinds` runs on existing events.
    kind: v.optional(eventKinds),
  })
    .index("by_slug", ["slug"])
    .index("by_status", ["status"])
    .index("by_year", ["year"])
    .index("by_kind", ["kind"]),
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
    // Operations theater participation; only set on delegates of theater events.
    theaterFactionId: v.optional(v.id("theaterFactions")),
    theaterPosition: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_tuitionId", ["tuitionId"])
    .index("by_type", ["type"])
    .index("by_committee", ["committee"])
    .index("by_delegatedCountry", ["delegatedCountry"])
    .index("by_theaterFactionId", ["theaterFactionId"])
    .index("by_eventId_and_type", ["eventId", "type"])
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
    // Keep creation-time ordering for the newest submissions across form versions.
    // eslint-disable-next-line @convex-dev/no-duplicate-indexes
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
    // Keep submitted answer order rather than sorting by field identifier.
    // eslint-disable-next-line @convex-dev/no-duplicate-indexes
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
    // Keep chronological grade history across kinds and categories.
    // eslint-disable-next-line @convex-dev/no-duplicate-indexes
    .index("by_member", ["member"])
    .index("by_kind", ["kind"])
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
    // Keep creation-time ordering across committees for daily attendance reads.
    // eslint-disable-next-line @convex-dev/no-duplicate-indexes
    .index("by_dateKey", ["dateKey"])
    .index("by_dateKey_and_committee", ["dateKey", "committee"])
    .index("by_eventId", { fields: ["eventId"], staged: true }),
  theaterFactions: defineTable({
    eventId: v.id("events"),
    name: v.string(),
    color: theaterFactionColors,
  }).index("by_eventId", ["eventId"]),
  theaterMarkers: defineTable({
    eventId: v.id("events"),
    title: v.string(),
    description: v.optional(v.string()),
    category: theaterMarkerCategories,
    infantryVariant: v.optional(v.union(v.literal("standard"), v.literal("heavy"))),
    factionId: v.optional(v.id("theaterFactions")),
    personnelCount: v.optional(v.number()),
    personnelCapacity: v.optional(v.number()),
    lat: v.number(),
    lng: v.number(),
    visibility: theaterMarkerVisibilities,
    // Factions that see the full marker when visibility is "factions".
    visibleToFactionIds: v.array(v.id("theaterFactions")),
    // Members that see the full marker when visibility is "members".
    visibleToMemberIds: v.optional(v.array(v.id("members"))),
    // What unselected viewers see for faction- or member-restricted markers.
    concealment: theaterMarkerConcealments,
    obscuredLabel: v.optional(v.string()),
  })
    .index("by_eventId", ["eventId"])
    .index("by_factionId", ["factionId"]),
  theaterOrders: defineTable({
    eventId: v.id("events"),
    senderMemberId: v.id("members"),
    // Snapshot of the sender faction when the order was sent.
    senderFactionId: v.optional(v.id("theaterFactions")),
    recipientFactionIds: v.array(v.id("theaterFactions")),
    recipientMemberIds: v.array(v.id("members")),
    classification: theaterOrderClassifications,
    subject: v.string(),
    body: v.string(),
    status: theaterOrderStatuses,
    gluconNote: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
  }).index("by_eventId", ["eventId"]),
});
