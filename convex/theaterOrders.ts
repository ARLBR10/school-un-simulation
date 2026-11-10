import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import {
  ensureFactionsInEvent,
  getTheaterViewer,
  isTheaterOperator,
  normalizeOptionalText,
  normalizeRequiredText,
  requireTheaterViewer,
  theaterOrderClassifications,
  theaterOrderStatuses,
  type TheaterViewer,
} from "./theater";

export type TheaterOrderView = {
  _id: Id<"theaterOrders">;
  _creationTime: number;
  subject: string;
  body: string;
  classification: Doc<"theaterOrders">["classification"];
  status: Doc<"theaterOrders">["status"];
  gluconNote: string | null;
  reviewedAt: number | null;
  sender: {
    memberId: Id<"members">;
    name: string;
    factionId: Id<"theaterFactions"> | null;
    isGlucon: boolean;
  };
  recipientFactionIds: Id<"theaterFactions">[];
  recipients: Array<{ memberId: Id<"members">; name: string }>;
  direction: "sent" | "received" | "visible";
};

function canReadOrder(order: Doc<"theaterOrders">, viewer: TheaterViewer) {
  if (isTheaterOperator(viewer)) return true;
  if (order.senderMemberId === viewer.member._id) return true;
  if (order.recipientMemberIds.includes(viewer.member._id)) return true;
  if (order.classification === "public") return true;
  if (order.classification === "secret" || viewer.factionId === null) return false;

  return (
    order.senderFactionId === viewer.factionId ||
    order.recipientFactionIds.includes(viewer.factionId)
  );
}

export const list = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args): Promise<TheaterOrderView[] | null> => {
    const viewer = await getTheaterViewer(ctx, args.eventId);
    if (!viewer) return null;

    const orders = await ctx.db
      .query("theaterOrders")
      .withIndex("by_eventId", (q) => q.eq("eventId", viewer.event._id))
      .order("desc")
      .take(300);

    const memberCache = new Map<Id<"members">, Doc<"members"> | null>();
    const getMember = async (memberId: Id<"members">) => {
      if (!memberCache.has(memberId)) {
        memberCache.set(memberId, await ctx.db.get("members", memberId));
      }
      return memberCache.get(memberId) ?? null;
    };

    const visibleOrders: TheaterOrderView[] = [];
    for (const order of orders) {
      if (!canReadOrder(order, viewer)) continue;

      const sender = await getMember(order.senderMemberId);
      const recipients = await Promise.all(
        order.recipientMemberIds.map(async (memberId) => ({
          memberId,
          name: (await getMember(memberId))?.name ?? "Participante removido",
        })),
      );
      const isRecipient =
        order.recipientMemberIds.includes(viewer.member._id) ||
        (order.classification !== "secret" &&
          viewer.factionId !== null &&
          order.recipientFactionIds.includes(viewer.factionId)) ||
        (viewer.role === "glucon" &&
          order.recipientMemberIds.length === 0 &&
          order.recipientFactionIds.length === 0);

      visibleOrders.push({
        _id: order._id,
        _creationTime: order._creationTime,
        subject: order.subject,
        body: order.body,
        classification: order.classification,
        status: order.status,
        gluconNote: order.gluconNote ?? null,
        reviewedAt: order.reviewedAt ?? null,
        sender: {
          memberId: order.senderMemberId,
          name: sender?.name ?? "Participante removido",
          factionId: order.senderFactionId ?? null,
          isGlucon: sender?.type === "glucon" || sender?.type === "admin",
        },
        recipientFactionIds: order.recipientFactionIds,
        recipients,
        direction:
          order.senderMemberId === viewer.member._id
            ? "sent"
            : isRecipient
              ? "received"
              : "visible",
      });
    }

    return visibleOrders;
  },
});

export const send = mutation({
  args: {
    eventId: v.id("events"),
    classification: theaterOrderClassifications,
    subject: v.string(),
    body: v.string(),
    recipientFactionIds: v.array(v.id("theaterFactions")),
    recipientMemberIds: v.array(v.id("members")),
  },
  returns: v.id("theaterOrders"),
  handler: async (ctx, args) => {
    const viewer = await requireTheaterViewer(ctx, args.eventId, [
      "admin",
      "glucon",
      "delegate",
    ]);

    if (args.classification === "secret" && args.recipientFactionIds.length > 0) {
      throw new Error(
        "Ordens sigilosas só podem ser enviadas a participantes específicos, não a facções inteiras.",
      );
    }
    const recipientFactionIds = await ensureFactionsInEvent(
      ctx,
      viewer.event._id,
      args.recipientFactionIds,
    );

    const recipientMemberIds = [...new Set(args.recipientMemberIds)].filter(
      (memberId) => memberId !== viewer.member._id,
    );
    if (recipientMemberIds.length > 50) {
      throw new Error("Selecione no máximo 50 participantes.");
    }
    for (const memberId of recipientMemberIds) {
      const recipient = await ctx.db.get("members", memberId);
      if (
        !recipient ||
        recipient.eventId !== viewer.event._id ||
        (recipient.type !== "glucon" &&
          !(recipient.type === "delegate" && recipient.theaterFactionId))
      ) {
        throw new Error("Destinatário não encontrado neste teatro de operações.");
      }
    }

    return await ctx.db.insert("theaterOrders", {
      eventId: viewer.event._id,
      senderMemberId: viewer.member._id,
      senderFactionId: viewer.factionId ?? undefined,
      recipientFactionIds,
      recipientMemberIds,
      classification: args.classification,
      subject: normalizeRequiredText(args.subject, "Assunto", 160),
      body: normalizeRequiredText(args.body, "Conteúdo", 8000),
      status: "sent",
    });
  },
});

export const review = mutation({
  args: {
    orderId: v.id("theaterOrders"),
    status: theaterOrderStatuses,
    gluconNote: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const order = await ctx.db.get("theaterOrders", args.orderId);
    if (!order) throw new Error("Ordem não encontrada.");
    await requireTheaterViewer(ctx, order.eventId, ["admin", "glucon"]);

    await ctx.db.patch("theaterOrders", order._id, {
      status: args.status,
      gluconNote: normalizeOptionalText(args.gluconNote, "Resposta do GLUCON", 2000),
      reviewedAt: Date.now(),
    });
    return null;
  },
});
