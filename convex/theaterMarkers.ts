import { v } from "convex/values";

import { defaultObscuredMarkerLabel, isWithinKoreaBounds } from "@/lib/theater";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import {
  ensureFactionsInEvent,
  getTheaterViewer,
  isTheaterOperator,
  normalizeOptionalText,
  normalizeRequiredText,
  requireTheaterViewer,
  theaterMarkerCategories,
  theaterMarkerConcealments,
  theaterMarkerVisibilities,
} from "./theater";

export type TheaterMarkerView =
  | {
      kind: "full";
      _id: Id<"theaterMarkers">;
      title: string;
      description: string | null;
      category: Doc<"theaterMarkers">["category"];
      factionId: Id<"theaterFactions"> | null;
      lat: number;
      lng: number;
      // Only sent to GLUCON and admins.
      access: Pick<
        Doc<"theaterMarkers">,
        "visibility" | "visibleToFactionIds" | "concealment" | "obscuredLabel"
      > | null;
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
  factionId: v.optional(v.id("theaterFactions")),
  lat: v.number(),
  lng: v.number(),
  visibility: theaterMarkerVisibilities,
  visibleToFactionIds: v.array(v.id("theaterFactions")),
  concealment: theaterMarkerConcealments,
  obscuredLabel: v.optional(v.string()),
};

type MarkerInput = {
  title: string;
  description?: string;
  category: Doc<"theaterMarkers">["category"];
  factionId?: Id<"theaterFactions">;
  lat: number;
  lng: number;
  visibility: Doc<"theaterMarkers">["visibility"];
  visibleToFactionIds: Id<"theaterFactions">[];
  concealment: Doc<"theaterMarkers">["concealment"];
  obscuredLabel?: string;
};

function ensureCoordinates(lat: number, lng: number) {
  if (!isWithinKoreaBounds(lat, lng)) {
    throw new Error("O marcador precisa ficar dentro da área do teatro de operações.");
  }
}

async function normalizeMarker(
  ctx: Pick<MutationCtx, "db">,
  eventId: Id<"events">,
  input: MarkerInput,
) {
  ensureCoordinates(input.lat, input.lng);
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

  return {
    title: normalizeRequiredText(input.title, "Título", 120),
    description: normalizeOptionalText(input.description, "Descrição", 2000),
    category: input.category,
    factionId,
    lat: input.lat,
    lng: input.lng,
    visibility: input.visibility,
    visibleToFactionIds,
    concealment: input.concealment,
    obscuredLabel: normalizeOptionalText(
      input.obscuredLabel,
      "Rótulo para as demais facções",
      120,
    ),
  };
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
    const isOperator = isTheaterOperator(viewer);

    return markers.flatMap((marker): TheaterMarkerView[] => {
      const canSeeFull =
        isOperator ||
        marker.visibility === "public" ||
        (marker.visibility === "factions" &&
          viewer.factionId !== null &&
          marker.visibleToFactionIds.includes(viewer.factionId));

      if (canSeeFull) {
        return [
          {
            kind: "full",
            _id: marker._id,
            title: marker.title,
            description: marker.description ?? null,
            category: marker.category,
            factionId: marker.factionId ?? null,
            lat: marker.lat,
            lng: marker.lng,
            access: isOperator
              ? {
                  visibility: marker.visibility,
                  visibleToFactionIds: marker.visibleToFactionIds,
                  concealment: marker.concealment,
                  obscuredLabel: marker.obscuredLabel,
                }
              : null,
          },
        ];
      }

      if (marker.visibility === "factions" && marker.concealment === "obscured") {
        return [
          {
            kind: "obscured",
            _id: marker._id,
            lat: marker.lat,
            lng: marker.lng,
            label: marker.obscuredLabel ?? defaultObscuredMarkerLabel,
          },
        ];
      }

      return [];
    });
  },
});

export const create = mutation({
  args: { eventId: v.id("events"), ...markerFields },
  returns: v.id("theaterMarkers"),
  handler: async (ctx, { eventId, ...input }) => {
    const viewer = await requireTheaterViewer(ctx, eventId, ["admin", "glucon"]);
    return await ctx.db.insert("theaterMarkers", {
      eventId: viewer.event._id,
      ...(await normalizeMarker(ctx, viewer.event._id, input)),
    });
  },
});

export const update = mutation({
  args: { markerId: v.id("theaterMarkers"), ...markerFields },
  returns: v.null(),
  handler: async (ctx, { markerId, ...input }) => {
    const marker = await ctx.db.get("theaterMarkers", markerId);
    if (!marker) throw new Error("Marcador não encontrado.");
    await requireTheaterViewer(ctx, marker.eventId, ["admin", "glucon"]);

    await ctx.db.patch(
      "theaterMarkers",
      marker._id,
      await normalizeMarker(ctx, marker.eventId, input),
    );
    return null;
  },
});

export const move = mutation({
  args: { markerId: v.id("theaterMarkers"), lat: v.number(), lng: v.number() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const marker = await ctx.db.get("theaterMarkers", args.markerId);
    if (!marker) throw new Error("Marcador não encontrado.");
    await requireTheaterViewer(ctx, marker.eventId, ["admin", "glucon"]);
    ensureCoordinates(args.lat, args.lng);

    await ctx.db.patch("theaterMarkers", marker._id, {
      lat: args.lat,
      lng: args.lng,
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
    await requireTheaterViewer(ctx, marker.eventId, ["admin", "glucon"]);

    await ctx.db.delete("theaterMarkers", marker._id);
    return null;
  },
});
