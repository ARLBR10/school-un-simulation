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
  create,
  normalizeMarkerPersonnel,
  toTheaterMarkerView,
  update,
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

describe("delegation marker creation", () => {
  const faction: Doc<"theaterFactions"> = {
    _id: "own-faction" as Id<"theaterFactions">,
    _creationTime: 0,
    eventId: event._id,
    name: "Delegação",
    color: "blue",
  };
  const delegate = { ...member, type: "delegate" as const, theaterFactionId: faction._id };
  const input = {
    eventId: event._id,
    title: marker.title,
    category: marker.category,
    lat: marker.lat,
    lng: marker.lng,
    factionId: "enemy-faction" as Id<"theaterFactions">,
    visibility: "public" as const,
    visibleToFactionIds: ["enemy-faction" as Id<"theaterFactions">],
    visibleToMemberIds: [member._id],
    concealment: "obscured" as const,
    obscuredLabel: "Informação vazada",
  };
  // Convex retains the handler at runtime but omits it from the public registration type.
  const registeredCreate = create as unknown as {
    _handler: (ctx: MutationCtx, args: typeof input) => Promise<Id<"theaterMarkers">>;
  };
  const createHandler = registeredCreate._handler;

  function creationContext(membership: Doc<"members"> = delegate, membershipEvent = event, factionEventId = event._id) {
    const records: Doc<"theaterMarkers">[] = [];
    const ctx = {
      ...viewerContext(membership, membershipEvent),
      db: {
        get: async (table: string, id: string) =>
          table === "events" ? membershipEvent :
            table === "theaterFactions" && id === faction._id
              ? { ...faction, eventId: factionEventId } : null,
        insert: async (_table: string, record: Omit<Doc<"theaterMarkers">, "_id" | "_creationTime">) => {
          records.push({ ...record, _id: marker._id, _creationTime: 0 });
          return marker._id;
        },
      },
    } as unknown as MutationCtx;
    return { ctx, records };
  }

  test("creates an own-faction marker and ignores forged ownership or audience", async () => {
    const { ctx, records } = creationContext();
    expect(await createHandler(ctx, input)).toBe(marker._id);
    const created = records[0];
    expect(created.eventId).toBe(event._id);
    expect(created.factionId).toBe(faction._id);
    expect(created.visibility).toBe("factions");
    expect(created.visibleToFactionIds).toEqual([faction._id]);
    expect(created.visibleToMemberIds).toEqual([]);
    expect(created.concealment).toBe("hidden");
    expect(created.obscuredLabel).toBeUndefined();
    expect(toTheaterMarkerView(created, {
      event, member: delegate, role: "delegate", factionId: faction._id,
    })?.kind).toBe("full");
    expect(toTheaterMarkerView(created, {
      ...viewer, role: "delegate", factionId: input.factionId,
    })).toBeNull();
    expect(toTheaterMarkerView(created, { ...viewer, role: "glucon" })?.kind).toBe("full");
  });

  test("rejects observers, unassigned delegates, past events, and cross-event factions", async () => {
    for (const membership of [
      { ...delegate, type: "observer" as const },
      { ...delegate, type: "unassigned" as const },
      { ...delegate, theaterFactionId: undefined },
    ]) {
      const { ctx, records } = creationContext(membership);
      await expect(createHandler(ctx, input)).rejects.toThrow("permissão");
      expect(records).toEqual([]);
    }
    const past = creationContext(delegate, { ...event, status: "past" });
    await expect(createHandler(past.ctx, input)).rejects.toThrow("somente para leitura");
    expect(past.records).toEqual([]);
    const wrongEvent = creationContext(delegate, event, otherEventId);
    await expect(createHandler(wrongEvent.ctx, input)).rejects.toThrow("Facção");
    expect(wrongEvent.records).toEqual([]);
  });
});

describe("delegation marker editing", () => {
  const factionId = "own-faction" as Id<"theaterFactions">;
  const delegate: Doc<"members"> = { ...member, type: "delegate", theaterFactionId: factionId };
  const ownMarker: Doc<"theaterMarkers"> = {
    ...marker,
    factionId,
    visibility: "factions",
    visibleToFactionIds: [factionId],
    visibleToMemberIds: [],
  };
  const input = {
    markerId: marker._id,
    title: "Título atualizado",
    description: "Situação atualizada",
    category: "intel" as const,
    personnelCount: 100,
    personnelCapacity: 200,
    factionId: "enemy-faction" as Id<"theaterFactions">,
    lat: 36,
    lng: 128,
    visibility: "public" as const,
    visibleToFactionIds: [],
    visibleToMemberIds: [],
    concealment: "obscured" as const,
  };
  // Convex retains handlers at runtime, outside the public registration type.
  const registeredUpdate = update as unknown as {
    _handler: (ctx: MutationCtx, args: typeof input) => Promise<null>;
  };

  function editingContext(
    target = ownMarker,
    membership = delegate,
    membershipEvent = event,
  ) {
    const patches: Partial<Doc<"theaterMarkers">>[] = [];
    const ctx = {
      ...viewerContext(membership, membershipEvent),
      db: {
        get: async (table: string, id: string) => {
          if (table === "events") return membershipEvent;
          if (table === "theaterMarkers") return target;
          if (table === "theaterFactions" && id === factionId) {
            return { _id: factionId, eventId: event._id };
          }
          return null;
        },
        patch: async (_table: string, _id: string, patch: Partial<Doc<"theaterMarkers">>) => {
          patches.push(patch);
        },
      },
    } as unknown as MutationCtx;
    return { ctx, patches };
  }

  test("edits faction content without changing ownership, position, or access", async () => {
    const { ctx, patches } = editingContext();
    await registeredUpdate._handler(ctx, input);
    expect(patches).toEqual([expect.objectContaining({
      title: input.title,
      description: input.description,
      category: input.category,
      personnelCount: input.personnelCount,
      factionId,
      lat: ownMarker.lat,
      lng: ownMarker.lng,
      visibility: ownMarker.visibility,
      visibleToFactionIds: ownMarker.visibleToFactionIds,
      visibleToMemberIds: [],
      concealment: ownMarker.concealment,
    })]);
  });

  test("rejects enemy, unaffiliated, hidden, obscured, and cross-event markers", async () => {
    for (const target of [
      { ...ownMarker, factionId: input.factionId, visibility: "public" as const },
      { ...ownMarker, factionId: undefined },
      { ...ownMarker, visibility: "glucon" as const },
      { ...ownMarker, visibleToFactionIds: [], concealment: "obscured" as const },
      { ...ownMarker, eventId: otherEventId },
    ]) {
      const { ctx, patches } = editingContext(target);
      await expect(registeredUpdate._handler(ctx, input)).rejects.toThrow();
      expect(patches).toEqual([]);
    }
  });

  test("rejects observers and edits in past events", async () => {
    const observer = editingContext(ownMarker, { ...delegate, type: "observer" });
    await expect(registeredUpdate._handler(observer.ctx, input)).rejects.toThrow("permissão");
    expect(observer.patches).toEqual([]);
    const past = editingContext(ownMarker, delegate, { ...event, status: "past" });
    await expect(registeredUpdate._handler(past.ctx, input)).rejects.toThrow("somente para leitura");
    expect(past.patches).toEqual([]);
  });
});
