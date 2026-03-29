import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { memberTypes } from "./members";

export default defineSchema({
  members: defineTable({
    userId: v.optional(v.string()), // IDs from others components don't count on convex/values. This is optional because the mtf could not be registered.
    name: v.string(),
    class: v.optional(v.string()),
    type: memberTypes,
    committee: v.optional(v.id("committees")),
    delegate: v.optional(v.string()), // @TODO: Be one of a big fat array of all the countries
  }).index("by_userId", ["userId"]),
  docs: defineTable({
    member: v.id("members"),
    type: v.union(
      v.literal("position_paper"), // AKA: Documento de Posição Oficial (DPO)
      v.literal("final_resolution"),
      v.string(), // Less headache?
    ),
    document_id: v.id("_storage"), // This could be wrong.
    google_docs: v.optional(v.string()),
  }),
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
});
