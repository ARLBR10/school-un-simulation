import { v } from "convex/values";

import type { TheaterRole } from "@/lib/theater";

import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

export const theaterFactionColors = v.union(
  v.literal("blue"),
  v.literal("red"),
  v.literal("green"),
  v.literal("yellow"),
  v.literal("purple"),
  v.literal("orange"),
  v.literal("gray"),
);

export const theaterMarkerCategories = v.union(
  v.literal("infantry"),
  v.literal("armor"),
  v.literal("artillery"),
  v.literal("air"),
  v.literal("naval"),
  v.literal("battle"),
  v.literal("objective"),
  v.literal("supply"),
  v.literal("intel"),
  v.literal("event"),
);

export const theaterMarkerVisibilities = v.union(
  v.literal("public"),
  v.literal("factions"),
  v.literal("members"),
  v.literal("glucon"),
);

export const theaterMarkerConcealments = v.union(
  v.literal("hidden"),
  v.literal("obscured"),
);

export const theaterOrderClassifications = v.union(
  v.literal("public"),
  v.literal("faction"),
  v.literal("secret"),
);

export const theaterOrderStatuses = v.union(
  v.literal("sent"),
  v.literal("acknowledged"),
  v.literal("executed"),
  v.literal("rejected"),
);

const theaterParticipantTypes = v.union(
  v.literal("glucon"),
  v.literal("delegate"),
  v.literal("observer"),
  v.literal("unassigned"),
);

export type TheaterViewer = {
  event: Doc<"events">;
  member: Doc<"members">;
  role: TheaterRole;
  factionId: Id<"theaterFactions"> | null;
};

type TheaterEventSummary = Pick<
  Doc<"events">,
  "_id" | "name" | "year" | "status"
>;

export type TheaterViewerSummary = {
  event: TheaterEventSummary;
  events: TheaterEventSummary[];
  role: TheaterRole;
  memberId: Id<"members">;
  memberName: string;
  position: string | null;
  factionId: Id<"theaterFactions"> | null;
};

export type TheaterDirectoryEntry = {
  memberId: Id<"members">;
  name: string;
  type: "glucon" | "delegate";
  factionId: Id<"theaterFactions"> | null;
  position: string | null;
};

const eventStatusRank: Record<Doc<"events">["status"], number> = {
  active: 0,
  planned: 1,
  past: 2,
};

function compareTheaterEvents(left: Doc<"events">, right: Doc<"events">) {
  return (
    eventStatusRank[left.status] - eventStatusRank[right.status] ||
    right.year - left.year ||
    right._creationTime - left._creationTime
  );
}

async function listTheaterEvents(ctx: Pick<QueryCtx, "db">) {
  const events = await ctx.db
    .query("events")
    .withIndex("by_kind", (q) => q.eq("kind", "operations_theater"))
    .take(50);
  return events.sort(compareTheaterEvents);
}

/**
 * Resolves who is looking at an operations theater event. Admins are global and
 * may open any theater event; everyone else only sees theater events where they
 * hold an assigned membership.
 */
export async function getTheaterViewer(
  ctx: QueryCtx | MutationCtx,
  eventId: Id<"events"> | undefined,
): Promise<TheaterViewer | null> {
  const userInfo = await ctx.runQuery(api.auth.getCurrentUser);
  if (!userInfo) return null;

  const adminMember = userInfo.memberships.find(
    ({ member }) => member.type === "admin",
  )?.member;
  if (adminMember) {
    const event = eventId
      ? await ctx.db.get("events", eventId)
      : ((await listTheaterEvents(ctx))[0] ?? null);
    if (event?.kind !== "operations_theater") return null;
    return { event, member: adminMember, role: "admin", factionId: null };
  }

  const theaterMemberships = userInfo.memberships
    .flatMap(({ member, event }) =>
      event?.kind === "operations_theater" && member.type !== "unassigned"
        ? [{ member, event }]
        : [],
    )
    .sort((left, right) => compareTheaterEvents(left.event, right.event));
  const selected = eventId
    ? theaterMemberships.find(({ event }) => event._id === eventId)
    : theaterMemberships[0];
  if (!selected) return null;

  const { member, event } = selected;
  if (member.type === "glucon") {
    return { event, member, role: "glucon", factionId: null };
  }
  if (member.type === "delegate" && member.theaterFactionId) {
    return { event, member, role: "delegate", factionId: member.theaterFactionId };
  }
  return { event, member, role: "observer", factionId: null };
}

/**
 * Same as `getTheaterViewer`, but for writes: requires one of `roles` and an
 * event that is not in the past.
 */
export async function requireTheaterViewer(
  ctx: MutationCtx,
  eventId: Id<"events">,
  roles: readonly TheaterRole[],
) {
  const viewer = await getTheaterViewer(ctx, eventId);
  if (!viewer || !roles.includes(viewer.role)) {
    throw new Error("Você não tem permissão para esta ação no teatro de operações.");
  }
  if (viewer.event.status === "past") {
    throw new Error(
      "Este teatro de operações pertence a um evento passado e está somente para leitura.",
    );
  }
  return viewer;
}

export function isTheaterOperator(viewer: TheaterViewer) {
  return viewer.role === "admin" || viewer.role === "glucon";
}

/** Throws unless every faction exists and belongs to `eventId`; returns them deduplicated. */
export async function ensureFactionsInEvent(
  ctx: Pick<MutationCtx, "db">,
  eventId: Id<"events">,
  factionIds: Id<"theaterFactions">[],
) {
  const uniqueIds = [...new Set(factionIds)];
  if (uniqueIds.length > 30) {
    throw new Error("Selecione no máximo 30 facções.");
  }
  for (const factionId of uniqueIds) {
    const faction = await ctx.db.get("theaterFactions", factionId);
    if (!faction || faction.eventId !== eventId) {
      throw new Error("Facção não encontrada neste teatro de operações.");
    }
  }
  return uniqueIds;
}

/** Validates the event memberships eligible to receive a restricted marker. */
export async function ensureMembersInEvent(
  ctx: Pick<MutationCtx, "db">,
  eventId: Id<"events">,
  memberIds: Id<"members">[],
) {
  const uniqueIds = [...new Set(memberIds)];
  if (uniqueIds.length === 0) {
    throw new Error("Escolha ao menos um participante que pode ver o marcador.");
  }
  if (uniqueIds.length > 999) {
    throw new Error("Selecione no máximo 999 participantes.");
  }
  for (const memberId of uniqueIds) {
    const member = await ctx.db.get("members", memberId);
    if (
      !member ||
      member.eventId !== eventId ||
      member.type === "unassigned" ||
      member.type === "admin"
    ) {
      throw new Error("Participante não encontrado ou sem função neste teatro de operações.");
    }
  }
  return uniqueIds;
}

export function normalizeRequiredText(
  value: string,
  label: string,
  maxLength: number,
) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`Preencha o campo "${label}".`);
  if (normalized.length > maxLength) {
    throw new Error(`O campo "${label}" aceita no máximo ${maxLength} caracteres.`);
  }
  return normalized;
}

export function normalizeOptionalText(
  value: string | null | undefined,
  label: string,
  maxLength: number,
) {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  if (normalized.length > maxLength) {
    throw new Error(`O campo "${label}" aceita no máximo ${maxLength} caracteres.`);
  }
  return normalized;
}

export const getViewer = query({
  // Raw string because it comes straight from the `?event=` search param.
  args: { eventId: v.optional(v.string()) },
  handler: async (ctx, args): Promise<TheaterViewerSummary | null> => {
    const eventId = args.eventId
      ? ctx.db.normalizeId("events", args.eventId)
      : undefined;
    if (eventId === null) return null;
    const viewer = await getTheaterViewer(ctx, eventId);
    if (!viewer) return null;

    const toSummary = ({ _id, name, year, status }: Doc<"events">) => ({
      _id,
      name,
      year,
      status,
    });
    let events: Doc<"events">[];
    if (viewer.role === "admin") {
      events = await listTheaterEvents(ctx);
    } else {
      const userInfo = await ctx.runQuery(api.auth.getCurrentUser);
      events = (userInfo?.memberships ?? [])
        .flatMap(({ member, event }) =>
          event?.kind === "operations_theater" && member.type !== "unassigned"
            ? [event]
            : [],
        )
        .sort(compareTheaterEvents);
    }

    return {
      event: toSummary(viewer.event),
      events: events.map(toSummary),
      role: viewer.role,
      memberId: viewer.member._id,
      memberName: viewer.member.name,
      position: viewer.member.theaterPosition ?? null,
      factionId: viewer.factionId,
    };
  },
});

export const listFactions = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args): Promise<Doc<"theaterFactions">[] | null> => {
    const viewer = await getTheaterViewer(ctx, args.eventId);
    if (!viewer) return null;

    return await ctx.db
      .query("theaterFactions")
      .withIndex("by_eventId", (q) => q.eq("eventId", viewer.event._id))
      .take(100);
  },
});

export const listDirectory = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args): Promise<TheaterDirectoryEntry[] | null> => {
    const viewer = await getTheaterViewer(ctx, args.eventId);
    if (!viewer || viewer.role === "observer") return null;

    const [gluconMembers, delegateMembers] = await Promise.all(
      (["glucon", "delegate"] as const).map((type) =>
        ctx.db
          .query("members")
          .withIndex("by_eventId_and_type", (q) =>
            q.eq("eventId", viewer.event._id).eq("type", type),
          )
          .take(500),
      ),
    );

    return [...gluconMembers, ...delegateMembers]
      .filter((member) => member.type === "glucon" || member.theaterFactionId)
      .map((member) => ({
        memberId: member._id,
        name: member.name,
        type: member.type === "glucon" ? "glucon" : "delegate",
        factionId: member.theaterFactionId ?? null,
        position: member.theaterPosition ?? null,
      }));
  },
});

export const listParticipants = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args): Promise<Doc<"members">[] | null> => {
    const viewer = await getTheaterViewer(ctx, args.eventId);
    if (!viewer || !isTheaterOperator(viewer)) return null;

    const members = await ctx.db
      .query("members")
      .withIndex("by_eventId_and_type", (q) => q.eq("eventId", viewer.event._id))
      .take(999);
    if (viewer.role === "admin") return members;

    // Marker audiences do not need enrollment, identity, or other personal data.
    return members.map((member) => ({
      _id: member._id,
      _creationTime: member._creationTime,
      eventId: member.eventId,
      name: member.name,
      type: member.type,
      theaterFactionId: member.theaterFactionId,
      theaterPosition: member.theaterPosition,
    }));
  },
});

export const createFaction = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    color: theaterFactionColors,
  },
  returns: v.id("theaterFactions"),
  handler: async (ctx, args) => {
    const viewer = await requireTheaterViewer(ctx, args.eventId, ["admin"]);
    return await ctx.db.insert("theaterFactions", {
      eventId: viewer.event._id,
      name: normalizeRequiredText(args.name, "Nome da facção", 80),
      color: args.color,
    });
  },
});

export const updateFaction = mutation({
  args: {
    factionId: v.id("theaterFactions"),
    name: v.optional(v.string()),
    color: v.optional(theaterFactionColors),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const faction = await ctx.db.get("theaterFactions", args.factionId);
    if (!faction) throw new Error("Facção não encontrada.");
    await requireTheaterViewer(ctx, faction.eventId, ["admin"]);

    await ctx.db.patch("theaterFactions", faction._id, {
      ...(args.name !== undefined
        ? { name: normalizeRequiredText(args.name, "Nome da facção", 80) }
        : {}),
      ...(args.color !== undefined ? { color: args.color } : {}),
    });
    return null;
  },
});

export const removeFaction = mutation({
  args: { factionId: v.id("theaterFactions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const faction = await ctx.db.get("theaterFactions", args.factionId);
    if (!faction) return null;
    await requireTheaterViewer(ctx, faction.eventId, ["admin"]);

    const [assignedMember, ownedMarker, eventMarkers] = await Promise.all([
      ctx.db
        .query("members")
        .withIndex("by_theaterFactionId", (q) => q.eq("theaterFactionId", faction._id))
        .first(),
      ctx.db
        .query("theaterMarkers")
        .withIndex("by_factionId", (q) => q.eq("factionId", faction._id))
        .first(),
      ctx.db
        .query("theaterMarkers")
        .withIndex("by_eventId", (q) => q.eq("eventId", faction.eventId))
        .take(1000),
    ]);
    if (
      assignedMember ||
      ownedMarker ||
      eventMarkers.some((marker) => marker.visibleToFactionIds.includes(faction._id))
    ) {
      throw new Error(
        "Esta facção ainda tem participantes ou marcadores vinculados. Remova os vínculos antes de excluí-la.",
      );
    }

    await ctx.db.delete("theaterFactions", faction._id);
    return null;
  },
});

export const updateParticipant = mutation({
  args: {
    memberId: v.id("members"),
    type: theaterParticipantTypes,
    theaterFactionId: v.union(v.id("theaterFactions"), v.null()),
    theaterPosition: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const member = await ctx.db.get("members", args.memberId);
    if (!member?.eventId) throw new Error("Participante não encontrado.");
    const viewer = await requireTheaterViewer(ctx, member.eventId, ["admin"]);

    if (args.type === "delegate" && !args.theaterFactionId) {
      throw new Error("Delegações precisam de uma facção.");
    }
    const [theaterFactionId] =
      args.type === "delegate" && args.theaterFactionId
        ? await ensureFactionsInEvent(ctx, viewer.event._id, [args.theaterFactionId])
        : [];

    await ctx.db.patch("members", member._id, {
      type: args.type,
      theaterFactionId,
      theaterPosition: normalizeOptionalText(args.theaterPosition, "Cargo", 80),
    });
    return null;
  },
});
