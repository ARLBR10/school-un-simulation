import { v } from "convex/values";

import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getPostHog } from "./posthog";

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
