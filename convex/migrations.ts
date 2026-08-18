import { Migrations } from "@convex-dev/migrations";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import { internalMutation, type MutationCtx } from "./_generated/server";
import schema from "./schema";

const migrations = new Migrations(components.migrations, { internalMutation, schema });
const legacyEventSlug = "onu-2026";

async function getLegacyEventId(ctx: Pick<MutationCtx, "db">) {
  const event = await ctx.db
    .query("events")
    .withIndex("by_slug", (q) => q.eq("slug", legacyEventSlug))
    .unique();

  if (!event) {
    throw new Error("Run migrations:seed2026Event before the backfill.");
  }
  return event._id;
}

export const seed2026Event = internalMutation({
  args: { name: v.optional(v.string()) },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("events")
      .withIndex("by_slug", (q) => q.eq("slug", legacyEventSlug))
      .unique();
    if (existing) return existing._id;

    return await ctx.db.insert("events", {
      name: args.name?.trim() || "Simulação da ONU 2026",
      slug: legacyEventSlug,
      year: 2026,
      status: "active",
    });
  },
});

export const backfillMembers2026 = migrations.define({
  table: "members",
  migrateOne: async (ctx, member) => {
    if (member.type === "admin" || member.eventId !== undefined) return;
    await ctx.db.patch(member._id, { eventId: await getLegacyEventId(ctx) });
  },
});

export const backfillCommittees2026 = migrations.define({
  table: "committees",
  migrateOne: async (ctx, committee) => {
    if (committee.eventId !== undefined) return;
    await ctx.db.patch(committee._id, { eventId: await getLegacyEventId(ctx) });
  },
});

export const backfillNews2026 = migrations.define({
  table: "news",
  migrateOne: async (ctx, news) => {
    if (news.eventId !== undefined) return;
    await ctx.db.patch(news._id, { eventId: await getLegacyEventId(ctx) });
  },
});

export const backfillGrading2026 = migrations.define({
  table: "gradingEntries",
  migrateOne: async (ctx, entry) => {
    if (entry.eventId !== undefined) return;
    await ctx.db.patch(entry._id, { eventId: await getLegacyEventId(ctx) });
  },
});

export const backfillDocuments2026 = migrations.define({
  table: "docs",
  migrateOne: async (ctx, document) => {
    if (document.eventId !== undefined) return;
    await ctx.db.patch(document._id, { eventId: await getLegacyEventId(ctx) });
  },
});

export const backfillAttendance2026 = migrations.define({
  table: "attendanceEntries",
  migrateOne: async (ctx, attendance) => {
    if (attendance.eventId !== undefined) return;
    await ctx.db.patch(attendance._id, { eventId: await getLegacyEventId(ctx) });
  },
});

export const run2026Backfill = migrations.runner([
  internal.migrations.backfillMembers2026,
  internal.migrations.backfillCommittees2026,
  internal.migrations.backfillNews2026,
  internal.migrations.backfillGrading2026,
  internal.migrations.backfillDocuments2026,
  internal.migrations.backfillAttendance2026,
]);
