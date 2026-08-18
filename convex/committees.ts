import { v } from "convex/values";

import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalQuery, mutation, query, type QueryCtx } from "./_generated/server";
import { getPostHog } from "./posthog";
import {
  getOperationalEventId,
  isEventInOperationalScope,
  resolveEventId,
} from "./events";

export type CommitteeClerkSummary = {
  _id: Id<"members">;
  name: string;
};

export type CommitteeDelegateSummary = {
  _id: Id<"members">;
  name: string;
  delegatedCountry: string | null;
};

export type CommitteeSummary = Doc<"committees"> & {
  clerks: CommitteeClerkSummary[];
  delegates: CommitteeDelegateSummary[];
  event: Pick<Doc<"events">, "_id" | "name" | "year" | "status"> | null;
  isPastEvent: boolean;
};

async function getCommitteeEvent(
  ctx: Pick<import("./_generated/server").QueryCtx, "db">,
  committee: Doc<"committees">,
) {
  const event = committee.eventId
    ? await ctx.db.get("events", committee.eventId)
    : await ctx.db
        .query("events")
        .withIndex("by_slug", (q) => q.eq("slug", "school-onu-2026"))
        .first();

  return event
    ? { _id: event._id, name: event.name, year: event.year, status: event.status }
    : null;
}

async function buildCommitteeSummaries(
  ctx: QueryCtx,
  committees: Doc<"committees">[],
) {
  const allMembers = await ctx.db.query("members").take(999);

  return await Promise.all(committees.map(async (committee) => {
    const clerks: CommitteeClerkSummary[] = allMembers
      .filter(
        (member) => member.committee === committee._id && member.type === "clerk",
      )
      .map((clerk) => ({ _id: clerk._id, name: clerk.name }));
    const delegates: CommitteeDelegateSummary[] = allMembers
      .filter(
        (member) =>
          member.committee === committee._id && member.type === "delegate",
      )
      .map((delegate) => ({
        _id: delegate._id,
        name: delegate.name,
        delegatedCountry: delegate.delegatedCountry ?? null,
      }));
    const event = await getCommitteeEvent(ctx, committee);

    return {
      ...committee,
      clerks,
      delegates,
      event,
      isPastEvent: event?.status === "past",
    };
  }));
}

export const getAll = query({
  args: {},
  async handler(ctx): Promise<Doc<"committees">[] | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type != "admin") {
      return null;
    }

    return await ctx.db.query("committees").take(999);
  },
});

export const list = query({
  args: {},
  async handler(ctx): Promise<CommitteeSummary[] | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (!userInfo?.member) {
      return null;
    }

    return await buildCommitteeSummaries(
      ctx,
      await ctx.db.query("committees").take(999),
    );
  },
});

export const listForManagement = query({
  args: {},
  async handler(ctx): Promise<CommitteeSummary[] | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);
    const member = userInfo?.member;
    if (!member || (member.type !== "press" && member.type !== "admin")) {
      return null;
    }

    const operationalEventId = await getOperationalEventId(ctx, member);
    if (!operationalEventId) return null;
    const candidates = await ctx.db.query("committees").take(999);
    const committees: Doc<"committees">[] = [];
    for (const committee of candidates) {
      if (
        await isEventInOperationalScope(
          ctx,
          committee.eventId,
          operationalEventId,
        )
      ) {
        committees.push(committee);
      }
    }

    return await buildCommitteeSummaries(ctx, committees);
  },
});

export const getById = query({
  args: {
    id: v.string(),
  },
  async handler(ctx, args): Promise<CommitteeSummary | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (!userInfo?.member) {
      return null;
    }

    const committeeId = ctx.db.normalizeId("committees", args.id);
    if (!committeeId) {
      return null;
    }

    const committee = await ctx.db.get("committees", committeeId);

    if (!committee) {
      return null;
    }

    const committeeMembers = await ctx.db
      .query("members")
      .withIndex("by_committee", (q) => q.eq("committee", committeeId))
      .take(999);

    const clerks: CommitteeClerkSummary[] = committeeMembers
      .filter((member) => member.type === "clerk")
      .map((clerk) => ({ _id: clerk._id, name: clerk.name }));

    const delegates: CommitteeDelegateSummary[] = committeeMembers
      .filter((member) => member.type === "delegate")
      .map((delegate) => ({
        _id: delegate._id,
        name: delegate.name,
        delegatedCountry: delegate.delegatedCountry ?? null,
      }));

    const event = await getCommitteeEvent(ctx, committee);
    return {
      ...committee,
      clerks,
      delegates,
      event,
      isPastEvent: event?.status === "past",
    };
  },
});

export const create = mutation({
  args: {
    theme: v.string(),
    topics: v.array(v.string()),
    description: v.string(),
    eventId: v.optional(v.id("events")),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type != "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "committees.create",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const newCommittee: Omit<Doc<"committees">, "_id" | "_creationTime"> = {
      theme: args.theme,
      topics: args.topics,
      description: args.description,
      eventId: await resolveEventId(ctx, args.eventId),
    };
    const committeeId = await ctx.db.insert("committees", newCommittee);

    await getPostHog().capture(ctx, {
      event: "admin_create_committee",
      properties: {
        createdCommitteeId: committeeId,
        createdCommitteeInfo: newCommittee,
      },
    });

    return true;
  },
});

export const update = mutation({
  args: {
    id: v.id("committees"),
    theme: v.optional(v.string()),
    topics: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    eventId: v.optional(v.id("events")),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type != "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "committees.update",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const existingCommittee = await ctx.db.get("committees", args.id);
    if (!existingCommittee) return null;
    if (
      args.eventId !== undefined &&
      existingCommittee.eventId !== undefined &&
      existingCommittee.eventId !== args.eventId
    ) {
      throw new Error(
        "O evento de um comitê não pode ser alterado. Crie um novo comitê para a nova edição.",
      );
    }

    const committeePatch: Partial<
      Omit<Doc<"committees">, "_id" | "_creationTime">
    > = {
      ...("theme" in args ? { theme: args.theme } : {}),
      ...("topics" in args ? { topics: args.topics } : {}),
      ...("description" in args ? { description: args.description } : {}),
      ...(args.eventId !== undefined
        ? { eventId: await resolveEventId(ctx, args.eventId) }
        : {}),
    };

    await ctx.db.patch("committees", args.id, committeePatch);
    await getPostHog().capture(ctx, {
      event: "admin_update_committee",
      properties: {
        id: args.id,
        dataReceived: args,
      },
    });

    return true;
  },
});

export const purge = mutation({
  args: {
    id: v.id("committees"),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type != "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "committees.purge",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    await ctx.db.delete("committees", args.id);
    await getPostHog().capture(ctx, {
      event: "admin_delete_committee",
      properties: {
        id: args.id,
      },
    });

    return true;
  },
});

export const get = internalQuery({
  args: {
    id: v.id("committees")
  }, 
  async handler(ctx, args) {
    return await ctx.db.get("committees", args.id)
  },
})
