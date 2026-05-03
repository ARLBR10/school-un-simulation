import { v } from "convex/values";

import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getPostHog } from "./posthog";

export type CommitteeClerkSummary = {
  _id: Id<"members">;
  name: string;
};

export type CommitteeDelegateSummary = {
  _id: Id<"members">;
  name: string;
  delegatedCountry: string | null;
};

export type CommitteeSummary = Omit<Doc<"committees">, "clerks"> & {
  clerks: CommitteeClerkSummary[];
  delegates: CommitteeDelegateSummary[];
};

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

    const committees = await ctx.db.query("committees").take(999);
    const allMembers = await ctx.db.query("members").take(999);

    const membersById = new Map<Id<"members">, Doc<"members">>();
    for (const member of allMembers) {
      membersById.set(member._id, member);
    }

    return committees.map((committee) => {
      const clerks: CommitteeClerkSummary[] = [];
      for (const clerkId of committee.clerks) {
        const clerk = membersById.get(clerkId);
        if (clerk) {
          clerks.push({ _id: clerk._id, name: clerk.name });
        }
      }

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

      return {
        ...committee,
        clerks,
        delegates,
      };
    });
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

    const committee = await ctx.db.get(committeeId);

    if (!committee) {
      return null;
    }

    const clerkDocs = await Promise.all(
      committee.clerks.map((clerkId) => ctx.db.get(clerkId)),
    );

    const clerks: CommitteeClerkSummary[] = clerkDocs
      .filter((clerk): clerk is Doc<"members"> => clerk !== null)
      .map((clerk) => ({ _id: clerk._id, name: clerk.name }));

    const committeeMembers = await ctx.db
      .query("members")
      .withIndex("by_committee", (q) => q.eq("committee", committeeId))
      .collect();

    const delegates: CommitteeDelegateSummary[] = committeeMembers
      .filter((member) => member.type === "delegate")
      .map((delegate) => ({
        _id: delegate._id,
        name: delegate.name,
        delegatedCountry: delegate.delegatedCountry ?? null,
      }));

    return {
      ...committee,
      clerks,
      delegates,
    };
  },
});

export const create = mutation({
  args: {
    clerks: v.array(v.id("members")),
    theme: v.string(),
    topics: v.array(v.string()),
    description: v.string(),
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
      clerks: args.clerks,
      theme: args.theme,
      topics: args.topics,
      description: args.description,
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
    clerks: v.optional(v.array(v.id("members"))),
    theme: v.optional(v.string()),
    topics: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
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

    const committeePatch: Partial<
      Omit<Doc<"committees">, "_id" | "_creationTime">
    > = {
      ...("clerks" in args ? { clerks: args.clerks } : {}),
      ...("theme" in args ? { theme: args.theme } : {}),
      ...("topics" in args ? { topics: args.topics } : {}),
      ...("description" in args ? { description: args.description } : {}),
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
