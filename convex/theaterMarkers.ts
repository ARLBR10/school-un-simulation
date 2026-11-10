import { v } from "convex/values";

import { defaultObscuredMarkerLabel, isWithinKoreaBounds } from "@/lib/theater";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  captureTheaterEvent,
  ensureFactionsInEvent,
  ensureMembersInEvent,
  getTheaterViewer,
  isTheaterOperator,
  normalizeOptionalText,
  normalizeRequiredText,
  requireTheaterViewer,
  theaterMarkerCategories,
  theaterMarkerConcealments,
  theaterMarkerVisibilities,
  type TheaterViewer,
} from "./theater";

export type TheaterMarkerView =
  | {
      kind: "full";
      _id: Id<"theaterMarkers">;
      title: string;
      description: string | null;
      category: Doc<"theaterMarkers">["category"];
      infantryVariant: "standard" | "heavy" | null;
      factionId: Id<"theaterFactions"> | null;
      personnelCount: number | null;
      personnelCapacity: number | null;
      lat: number;
      lng: number;
      // Only sent to GLUCON and admins.
      access: Pick<
        Doc<"theaterMarkers">,
        "visibility" | "visibleToFactionIds" | "concealment" | "obscuredLabel"
      > & { visibleToMemberIds: Id<"members">[] } | null;
    }
  | {
      kind: "obscured";
      _id: Id<"theaterMarkers">;
      lat: number;
      lng: number;
      label: string;
    };

const markerFields = {
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
  visibleToFactionIds: v.array(v.id("theaterFactions")),
  visibleToMemberIds: v.optional(v.array(v.id("members"))),
  concealment: theaterMarkerConcealments,
  obscuredLabel: v.optional(v.string()),
};

type MarkerInput = {
  title: string;
  description?: string;
  category: Doc<"theaterMarkers">["category"];
  infantryVariant?: "standard" | "heavy";
  factionId?: Id<"theaterFactions">;
  personnelCount?: number;
  personnelCapacity?: number;
  lat: number;
  lng: number;
  visibility: Doc<"theaterMarkers">["visibility"];
  visibleToFactionIds: Id<"theaterFactions">[];
  visibleToMemberIds?: Id<"members">[];
  concealment: Doc<"theaterMarkers">["concealment"];
  obscuredLabel?: string;
};

function ensureCoordinates(lat: number, lng: number) {
  if (!isWithinKoreaBounds(lat, lng)) {
    throw new Error("O marcador precisa ficar dentro da área do teatro de operações.");
  }
}

export function normalizeMarkerPersonnel(
  personnelCount: number | undefined,
  personnelCapacity: number | undefined,
) {
  for (const [label, value] of [
    ["Efetivo", personnelCount],
    ["Capacidade", personnelCapacity],
  ] as const) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0)) {
      throw new Error(`${label} deve ser um número inteiro não negativo e seguro.`);
    }
  }
  if (
    personnelCount !== undefined &&
    personnelCapacity !== undefined &&
    personnelCount > personnelCapacity
  ) {
    throw new Error("O efetivo não pode exceder a capacidade do marcador.");
  }
  return { personnelCount, personnelCapacity };
}

async function normalizeMarker(
  ctx: Pick<MutationCtx, "db">,
  eventId: Id<"events">,
  input: MarkerInput,
) {
  ensureCoordinates(input.lat, input.lng);
  const personnel = normalizeMarkerPersonnel(input.personnelCount, input.personnelCapacity);
  const [factionId] = input.factionId
    ? await ensureFactionsInEvent(ctx, eventId, [input.factionId])
    : [];
  const visibleToFactionIds =
    input.visibility === "factions"
      ? await ensureFactionsInEvent(ctx, eventId, input.visibleToFactionIds)
      : [];
  if (input.visibility === "factions" && visibleToFactionIds.length === 0) {
    throw new Error("Escolha ao menos uma facção que pode ver o marcador.");
  }
  const visibleToMemberIds =
    input.visibility === "members"
      ? await ensureMembersInEvent(ctx, eventId, input.visibleToMemberIds ?? [])
      : [];

  return {
    title: normalizeRequiredText(input.title, "Título", 120),
    description: normalizeOptionalText(input.description, "Descrição", 2000),
    category: input.category,
    infantryVariant: input.category === "infantry" ? input.infantryVariant ?? "standard" : undefined,
    factionId,
    ...personnel,
    lat: input.lat,
    lng: input.lng,
    visibility: input.visibility,
    visibleToFactionIds,
    visibleToMemberIds,
    concealment: input.concealment,
    obscuredLabel: normalizeOptionalText(
      input.obscuredLabel,
      "Rótulo para as demais facções",
      120,
    ),
  };
}

/** Projects only the information this event membership is allowed to receive. */
export function toTheaterMarkerView(
  marker: Doc<"theaterMarkers">,
  viewer: TheaterViewer,
): TheaterMarkerView | null {
  if (viewer.event._id !== marker.eventId) return null;
  const isOperator = isTheaterOperator(viewer);
  const canSeeFull =
    isOperator ||
    marker.visibility === "public" ||
    (marker.visibility === "factions" &&
      viewer.factionId !== null &&
      marker.visibleToFactionIds.includes(viewer.factionId)) ||
    (marker.visibility === "members" &&
      viewer.member.eventId === marker.eventId &&
      (marker.visibleToMemberIds ?? []).includes(viewer.member._id));

  if (canSeeFull) {
    return {
      kind: "full",
      _id: marker._id,
      title: marker.title,
      description: marker.description ?? null,
      category: marker.category,
      infantryVariant: marker.category === "infantry" ? marker.infantryVariant ?? "standard" : null,
      factionId: marker.factionId ?? null,
      personnelCount: marker.personnelCount ?? null,
      personnelCapacity: marker.personnelCapacity ?? null,
      lat: marker.lat,
      lng: marker.lng,
      access: isOperator
        ? {
            visibility: marker.visibility,
            visibleToFactionIds: marker.visibleToFactionIds,
            visibleToMemberIds: marker.visibleToMemberIds ?? [],
            concealment: marker.concealment,
            obscuredLabel: marker.obscuredLabel,
          }
        : null,
    };
  }

  if (
    (marker.visibility === "factions" || marker.visibility === "members") &&
    marker.concealment === "obscured"
  ) {
    return {
      kind: "obscured",
      _id: marker._id,
      lat: marker.lat,
      lng: marker.lng,
      label: marker.obscuredLabel ?? defaultObscuredMarkerLabel,
    };
  }
  return null;
}

export const list = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args): Promise<TheaterMarkerView[] | null> => {
    const viewer = await getTheaterViewer(ctx, args.eventId);
    if (!viewer) return null;

    const markers = await ctx.db
      .query("theaterMarkers")
      .withIndex("by_eventId", (q) => q.eq("eventId", viewer.event._id))
      .take(1000);
    return markers.flatMap((marker) => {
      const view = toTheaterMarkerView(marker, viewer);
      return view ? [view] : [];
    });
  },
});

export const create = mutation({
  args: { eventId: v.id("events"), ...markerFields },
  returns: v.id("theaterMarkers"),
  handler: async (ctx, { eventId, ...input }) => {
    const viewer = await requireTheaterViewer(ctx, eventId, ["admin", "glucon", "delegate"]);
    if (viewer.role === "delegate") {
      if (!viewer.factionId) {
        throw new Error("Sua delegação precisa estar vinculada a uma facção.");
      }
      // Delegations cannot impersonate another faction or publish restricted information.
      input = {
        ...input,
        factionId: viewer.factionId,
        visibility: "factions",
        visibleToFactionIds: [viewer.factionId],
        visibleToMemberIds: [],
        concealment: "hidden",
        obscuredLabel: undefined,
      };
    }
    const markerId = await ctx.db.insert("theaterMarkers", {
      eventId: viewer.event._id,
      ...(await normalizeMarker(ctx, viewer.event._id, input)),
    });
    await captureTheaterEvent(ctx, viewer, "theater_marker_created", {
      markerId,
      category: input.category,
      visibility: input.visibility,
      factionId: input.factionId ?? null,
    });
    return markerId;
  },
});

export const update = mutation({
  args: { markerId: v.id("theaterMarkers"), ...markerFields },
  returns: v.null(),
  handler: async (ctx, { markerId, ...input }) => {
    const marker = await ctx.db.get("theaterMarkers", markerId);
    if (!marker) throw new Error("Marcador não encontrado.");
    const viewer = await requireTheaterViewer(ctx, marker.eventId, ["admin", "glucon", "delegate"]);
    if (viewer.role === "delegate") {
      if (
        !viewer.factionId ||
        marker.factionId !== viewer.factionId ||
        toTheaterMarkerView(marker, viewer)?.kind !== "full"
      ) {
        throw new Error("Você só pode editar marcadores visíveis da sua própria facção.");
      }
      // Delegations edit content, never ownership, position, or operator-defined access.
      input = {
        ...input,
        factionId: marker.factionId,
        lat: marker.lat,
        lng: marker.lng,
        visibility: marker.visibility,
        visibleToFactionIds: marker.visibleToFactionIds,
        visibleToMemberIds: marker.visibleToMemberIds,
        concealment: marker.concealment,
        obscuredLabel: marker.obscuredLabel,
      };
    }

    await ctx.db.patch(
      "theaterMarkers",
      marker._id,
      await normalizeMarker(ctx, marker.eventId, input),
    );
    await captureTheaterEvent(ctx, viewer, "theater_marker_updated", {
      markerId: marker._id,
      category: input.category,
      visibility: input.visibility,
      factionId: input.factionId ?? null,
    });
    return null;
  },
});

export const move = mutation({
  args: { markerId: v.id("theaterMarkers"), lat: v.number(), lng: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const marker = await ctx.db.get("theaterMarkers", args.markerId);
    if (!marker) throw new Error("Marcador não encontrado.");
    const viewer = await requireTheaterViewer(ctx, marker.eventId, ["admin", "glucon"]);
    ensureCoordinates(args.lat, args.lng);

    await ctx.db.patch("theaterMarkers", marker._id, {
      lat: args.lat,
      lng: args.lng,
    });
    await captureTheaterEvent(ctx, viewer, "theater_marker_moved", {
      markerId: marker._id,
    });
    return null;
  },
});

export const remove = mutation({
  args: { markerId: v.id("theaterMarkers") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const marker = await ctx.db.get("theaterMarkers", args.markerId);
    if (!marker) return null;
    const viewer = await requireTheaterViewer(ctx, marker.eventId, ["admin", "glucon"]);

    await ctx.db.delete("theaterMarkers", marker._id);
    await captureTheaterEvent(ctx, viewer, "theater_marker_deleted", {
      markerId: marker._id,
    });
    return null;
  },
});
