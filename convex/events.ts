import { v } from "convex/values";

import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  internalQuery,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

export const eventStatuses = v.union(
  v.literal("planned"),
  v.literal("active"),
  v.literal("past"),
);

const eventDocument = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  year: v.number(),
  status: eventStatuses,
});

export async function resolveEventId(
  ctx: Pick<MutationCtx, "db">,
  eventId?: Id<"events">,
) {
  if (eventId) {
    const event = await ctx.db.get("events", eventId);
    if (!event) {
      throw new Error("Evento não encontrado.");
    }
    return event._id;
  }

  const activeEvent = await ctx.db
    .query("events")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .unique();

  if (!activeEvent) {
    throw new Error("Nenhum evento ativo foi configurado.");
  }

  return activeEvent._id;
}

export async function getOperationalEventId(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  member: Doc<"members">,
) {
  if (member.type !== "admin" && member.eventId) {
    return member.eventId;
  }

  const activeEvent = await ctx.db
    .query("events")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .unique();
  return activeEvent?._id ?? null;
}

export async function isEventInOperationalScope(
  ctx: Pick<QueryCtx | MutationCtx, "db">,
  recordEventId: Id<"events"> | undefined,
  operationalEventId: Id<"events">,
) {
  if (recordEventId === operationalEventId) return true;
  if (recordEventId !== undefined) return false;

  const operationalEvent = await ctx.db.get("events", operationalEventId);
  return operationalEvent?.slug === "school-onu-2026";
}

async function ensureUniqueEvent(
  ctx: Pick<MutationCtx, "db">,
  slug: string,
  year: number,
  ignoredId?: Id<"events">,
) {
  const [eventBySlug, eventByYear] = await Promise.all([
    ctx.db.query("events").withIndex("by_slug", (q) => q.eq("slug", slug)).first(),
    ctx.db.query("events").withIndex("by_year", (q) => q.eq("year", year)).first(),
  ]);

  if (
    (eventBySlug && eventBySlug._id !== ignoredId) ||
    (eventByYear && eventByYear._id !== ignoredId)
  ) {
    throw new Error("Já existe um evento com este identificador ou ano.");
  }
}

async function ensureSingleActiveEvent(
  ctx: Pick<MutationCtx, "db">,
  status: Doc<"events">["status"],
  ignoredId?: Id<"events">,
) {
  if (status !== "active") return;

  const activeEvent = await ctx.db
    .query("events")
    .withIndex("by_status", (q) => q.eq("status", "active"))
    .first();

  if (activeEvent && activeEvent._id !== ignoredId) {
    throw new Error("Já existe um evento ativo. Marque-o como passado primeiro.");
  }
}

export const getActive = internalQuery({
  args: {},
  returns: v.union(eventDocument, v.null()),
  handler: async (ctx) => {
    return await ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .unique();
  },
});

export const getAll = query({
  args: {},
  returns: v.union(v.array(eventDocument), v.null()),
  handler: async (ctx) => {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);
    if (userInfo?.member?.type !== "admin") return null;

    return await ctx.db.query("events").order("desc").take(100);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
    year: v.number(),
    status: eventStatuses,
  },
  returns: v.union(v.id("events"), v.null()),
  handler: async (ctx, args) => {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);
    if (userInfo?.member?.type !== "admin") return null;

    const name = args.name.trim();
    const slug = args.slug.trim().toLowerCase();
    if (!name || !slug || !Number.isInteger(args.year)) {
      throw new Error("Informe nome, identificador e ano válidos.");
    }

    await ensureUniqueEvent(ctx, slug, args.year);
    await ensureSingleActiveEvent(ctx, args.status);
    return await ctx.db.insert("events", { name, slug, year: args.year, status: args.status });
  },
});

export const update = mutation({
  args: {
    id: v.id("events"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    year: v.optional(v.number()),
    status: v.optional(eventStatuses),
  },
  returns: v.union(v.boolean(), v.null()),
  handler: async (ctx, args) => {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);
    if (userInfo?.member?.type !== "admin") return null;

    const existing = await ctx.db.get("events", args.id);
    if (!existing) return null;

    const slug = args.slug?.trim().toLowerCase() ?? existing.slug;
    const year = args.year ?? existing.year;
    const status = args.status ?? existing.status;
    await ensureUniqueEvent(ctx, slug, year, existing._id);
    await ensureSingleActiveEvent(ctx, status, existing._id);

    await ctx.db.patch("events", existing._id, {
      ...(args.name !== undefined ? { name: args.name.trim() } : {}),
      ...(args.slug !== undefined ? { slug } : {}),
      ...(args.year !== undefined ? { year } : {}),
      ...(args.status !== undefined ? { status } : {}),
    });
    return true;
  },
});
