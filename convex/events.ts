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
import { getPostHog } from "./posthog";

export const eventStatuses = v.union(
  v.literal("planned"),
  v.literal("active"),
  v.literal("past"),
);

export const eventKinds = v.union(
  v.literal("un_simulation"),
  v.literal("operations_theater"),
);

const eventDocument = v.object({
  _id: v.id("events"),
  _creationTime: v.number(),
  name: v.string(),
  slug: v.string(),
  year: v.number(),
  status: eventStatuses,
  kind: v.optional(eventKinds),
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
  kind: NonNullable<Doc<"events">["kind"]>,
  ignoredId?: Id<"events">,
) {
  const [eventBySlug, eventsByYear] = await Promise.all([
    ctx.db.query("events").withIndex("by_slug", (q) => q.eq("slug", slug)).first(),
    ctx.db.query("events").withIndex("by_year", (q) => q.eq("year", year)).take(20),
  ]);

  // Events created before `kind` existed are UN simulations until
  // `backfillEventKinds` runs and the schema field becomes required.
  if (
    (eventBySlug && eventBySlug._id !== ignoredId) ||
    eventsByYear.some(
      (event) =>
        event._id !== ignoredId && (event.kind ?? "un_simulation") === kind,
    )
  ) {
    throw new Error(
      "Já existe um evento com este identificador ou um evento do mesmo tipo neste ano.",
    );
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
    kind: eventKinds,
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

    await ensureUniqueEvent(ctx, slug, args.year, args.kind);
    await ensureSingleActiveEvent(ctx, args.status);
    const eventId = await ctx.db.insert("events", {
      name,
      slug,
      year: args.year,
      status: args.status,
      kind: args.kind,
    });

    await getPostHog().capture(ctx, {
      event: "admin_create_event",
      properties: {
        eventId,
        after: {
          id: eventId,
          name,
          slug,
          year: args.year,
          status: args.status,
          kind: args.kind,
        },
      },
    });

    return eventId;
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
    await ensureUniqueEvent(
      ctx,
      slug,
      year,
      existing.kind ?? "un_simulation",
      existing._id,
    );
    await ensureSingleActiveEvent(ctx, status, existing._id);

    const eventPatch = {
      ...(args.name !== undefined ? { name: args.name.trim() } : {}),
      ...(args.slug !== undefined ? { slug } : {}),
      ...(args.year !== undefined ? { year } : {}),
      ...(args.status !== undefined ? { status } : {}),
    };
    await ctx.db.patch("events", existing._id, eventPatch);
    const updated = await ctx.db.get("events", existing._id);

    await getPostHog().capture(ctx, {
      event: "admin_update_event",
      properties: {
        eventId: existing._id,
        before: existing,
        after: updated,
        changedFields: Object.keys(eventPatch),
      },
    });

    return true;
  },
});
