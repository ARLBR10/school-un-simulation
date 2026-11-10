import { describe, expect, test } from "bun:test";

import type { Doc, Id } from "../convex/_generated/dataModel";
import type { MutationCtx } from "../convex/_generated/server";
import {
  ensureMembersInEvent,
  getTheaterViewer,
  requireTheaterViewer,
  type TheaterViewer,
} from "../convex/theater";
import {
  normalizeMarkerPersonnel,
  toTheaterMarkerView,
} from "../convex/theaterMarkers";

const event: Doc<"events"> = {
  _id: "theater-2026" as Id<"events">,
  _creationTime: 0,
  name: "Teatro 2026",
  slug: "theater-2026",
  year: 2026,
  kind: "operations_theater",
  status: "active",
};
const otherEventId = "theater-2027" as Id<"events">;
const member: Doc<"members"> = {
  _id: "selected-member" as Id<"members">,
  _creationTime: 0,
  eventId: event._id,
  name: "Participante",
  type: "observer",
};
const viewer: TheaterViewer = { event, member, role: "observer", factionId: null };
const marker: Doc<"theaterMarkers"> = {
  _id: "restricted-marker" as Id<"theaterMarkers">,
  _creationTime: 0,
  eventId: event._id,
  title: "Unidade restrita",
  description: "Informação restrita",
  category: "infantry",
  personnelCount: 120,
  personnelCapacity: 200,
  lat: 38,
  lng: 127,
  visibility: "members",
  visibleToFactionIds: [],
  visibleToMemberIds: [member._id],
  concealment: "hidden",
};

// These helpers exercise server policy without a live deployment or auth service.
function memberContext(members: Doc<"members">[]) {
  return {
    db: {
      get: async (_table: "members", id: Id<"members">) =>
        members.find((entry) => entry._id === id) ?? null,
    },
  } as unknown as Pick<MutationCtx, "db">;
}

function viewerContext(membership: Doc<"members">, membershipEvent = event) {
  return {
    runQuery: async () => ({ memberships: [{ member: membership, event: membershipEvent }] }),
    db: { get: async () => membershipEvent },
  } as unknown as MutationCtx;
}

describe("theater marker personnel", () => {
  test("preserves omitted values and accepts zero, capacity equality, and safe integers", () => {
    expect(normalizeMarkerPersonnel(undefined, undefined)).toEqual({
      personnelCount: undefined,
      personnelCapacity: undefined,
    });
    expect(normalizeMarkerPersonnel(0, 0)).toEqual({ personnelCount: 0, personnelCapacity: 0 });
    expect(normalizeMarkerPersonnel(200, 200).personnelCount).toBe(200);
    expect(normalizeMarkerPersonnel(Number.MAX_SAFE_INTEGER, undefined).personnelCount)
      .toBe(Number.MAX_SAFE_INTEGER);
    expect(normalizeMarkerPersonnel(undefined, 0).personnelCapacity).toBe(0);
  });

  test("rejects negative, fractional, unsafe, and nonfinite values in either field", () => {
    for (const invalid of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, NaN, Infinity, -Infinity]) {
      expect(() => normalizeMarkerPersonnel(invalid, undefined)).toThrow();
      expect(() => normalizeMarkerPersonnel(undefined, invalid)).toThrow();
    }
    expect(() => normalizeMarkerPersonnel(201, 200)).toThrow("exceder");
    expect(() => normalizeMarkerPersonnel(1, 0)).toThrow("exceder");
  });
});

describe("theater marker audiences", () => {
  test("allows only the selected event membership and never sends its access list", () => {
    const full = toTheaterMarkerView(marker, viewer);
    expect(full?.kind).toBe("full");
    if (full?.kind !== "full") throw new Error("Expected full marker");
    expect(full.personnelCount).toBe(120);
    expect(full.personnelCapacity).toBe(200);
    expect(full.access).toBeNull();
    expect(full).not.toHaveProperty("visibleToMemberIds");
    expect(toTheaterMarkerView(marker, {
      ...viewer,
      member: { ...member, _id: "another-membership" as Id<"members"> },
    })).toBeNull();
    expect(toTheaterMarkerView(marker, {
      ...viewer,
      member: { ...member, eventId: otherEventId },
    })).toBeNull();
  });

  test("fully redacts an obscured member marker for unselected viewers", () => {
    const obscured = toTheaterMarkerView({
      ...marker,
      visibleToMemberIds: [],
      concealment: "obscured",
      obscuredLabel: "Movimento não identificado",
    }, viewer);
    expect(obscured).toEqual({
      kind: "obscured",
      _id: marker._id,
      lat: marker.lat,
      lng: marker.lng,
      label: "Movimento não identificado",
    });
  });

  test("operators retain full access and legacy records use null counts and an empty audience", () => {
    for (const role of ["admin", "glucon"] as const) {
      const full = toTheaterMarkerView({
        ...marker,
        personnelCount: undefined,
        personnelCapacity: undefined,
        visibleToMemberIds: undefined,
      }, { ...viewer, role });
      expect(full?.kind).toBe("full");
      if (full?.kind !== "full") throw new Error("Expected full marker");
      expect(full.personnelCount).toBeNull();
      expect(full.personnelCapacity).toBeNull();
      expect(full.access?.visibleToMemberIds).toEqual([]);
    }
  });

  test("preserves public, faction, and GLUCON-only behavior", () => {
    expect(toTheaterMarkerView({ ...marker, visibility: "public" }, viewer)?.kind).toBe("full");
    expect(toTheaterMarkerView({ ...marker, visibility: "glucon", concealment: "obscured" }, viewer))
      .toBeNull();
    const factionId = "faction" as Id<"theaterFactions">;
    const factionMarker = { ...marker, visibility: "factions" as const, visibleToFactionIds: [factionId] };
    expect(toTheaterMarkerView(factionMarker, { ...viewer, role: "delegate", factionId })?.kind)
      .toBe("full");
    expect(toTheaterMarkerView({ ...factionMarker, concealment: "obscured" }, viewer)?.kind)
      .toBe("obscured");
    expect(toTheaterMarkerView(marker, { ...viewer, event: { ...event, _id: otherEventId } }))
      .toBeNull();
  });

  test("deduplicates assigned same-event memberships and rejects invalid selections", async () => {
    await expect(ensureMembersInEvent(memberContext([member]), event._id, [member._id, member._id]))
      .resolves.toEqual([member._id]);
    await expect(ensureMembersInEvent(memberContext([member]), event._id, []))
      .rejects.toThrow("ao menos um participante");
    for (const invalidMember of [
      { ...member, eventId: otherEventId },
      { ...member, eventId: undefined },
      { ...member, type: "unassigned" as const },
      { ...member, type: "admin" as const },
    ]) {
      await expect(ensureMembersInEvent(memberContext([invalidMember]), event._id, [member._id]))
        .rejects.toThrow("Participante");
    }
    await expect(ensureMembersInEvent(memberContext([]), event._id, [member._id]))
      .rejects.toThrow("Participante");
  });
});

describe("theater marker write gates", () => {
  test("does not resolve unassigned memberships or let nonoperators edit", async () => {
    expect(await getTheaterViewer(viewerContext({ ...member, type: "unassigned" }), event._id))
      .toBeNull();
    for (const type of ["observer", "delegate", "unassigned"] as const) {
      await expect(requireTheaterViewer(viewerContext({
        ...member,
        type,
        theaterFactionId: "faction" as Id<"theaterFactions">,
      }), event._id, ["admin", "glucon"]))
        .rejects.toThrow("permissão");
    }
  });

  test("rejects edits to past events even for operators", async () => {
    for (const type of ["admin", "glucon"] as const) {
      await expect(requireTheaterViewer(
        viewerContext({ ...member, type }, { ...event, status: "past" }),
        event._id,
        ["admin", "glucon"],
      )).rejects.toThrow("somente para leitura");
    }
  });
});
