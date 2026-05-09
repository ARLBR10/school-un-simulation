import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { memberTypes } from "./members";
import { countriesConvexSchema } from "@/lib/country-list";

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
    .index("by_committee", ["committee"])
    .index("by_delegatedCountry", ["delegatedCountry"]),
  docs: defineTable({
    member: v.id("members"),
    delegate: v.optional(v.id("members")),
    type: v.union(
      v.literal("position_paper"), // AKA: Documento de Posição Oficial (DPO)
      v.literal("final_resolution"),
      v.string(), // Less headache?
    ),
    document_id: v.id("_storage"), // This could be wrong.
    google_docs: v.optional(v.string()),
  })
    .index("by_delegate", ["delegate"])
    .index("by_member", ["member"]),
  committees: defineTable({
    clerks: v.array(v.id("members")),
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
    kind: v.union(v.literal("grade"), v.literal("deduction")),
    category: v.string(),
    amount: v.number(),
    note: v.optional(v.string()),
  })
    .index("by_member", ["member"])
    .index("by_kind", ["kind"])
    .index("by_member_and_kind", ["member", "kind"]),
});
