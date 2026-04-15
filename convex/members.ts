import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { internalQuery, mutation, query } from "./_generated/server";
import { getPostHog } from "./posthog";

export const memberTypes = v.union(
  v.literal("delegate"),
  v.literal("logistics"),
  v.literal("press"),
  v.literal("clerk"), // Clerk ~ "Mesário"
  v.literal("teacher"),
  v.literal("admin"), // Coordenação, Secretary General, Meg Dev (@ARLBR10)
);

export const getByUserId = internalQuery({
  args: {
    userId: v.optional(v.string()),
  },
  async handler(ctx, args): Promise<Doc<"members"> | null> {
    if (!args.userId) {
      return null;
    }

    return await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const get = internalQuery({
  args: {
    id: v.id("members"),
  },
  async handler(ctx, args): Promise<null | Doc<"members">> {
    return ctx.db.get(args.id);
  },
});

export const getAll = query({
  async handler(ctx): Promise<Doc<"members">[] | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    // Permission check
    if (userInfo?.member?.type != "admin") {
      return null;
    }

    return await ctx.db.query("members").collect();
  },
});

// The admin type shouldn't be set by ANY mutation, that job should only occur at the Convex Admin

export const create = mutation({
  args: {
    // Keep this up-to-date the table.
    userId: v.optional(v.string()),
    name: v.string(),
    class: v.optional(v.string()),
    type: memberTypes,
    committee: v.optional(v.id("committees")),
    delegate: v.optional(v.string()),
  },
  async handler(ctx, args): Promise<null | Boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    // Permission check
    if (userInfo?.member?.type != "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "member.create",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const newMember: Omit<Doc<"members">, "_id" | "_creationTime"> = {
      type: args.type === "admin" ? "delegate" : args.type,
      name: args.name,
      ...(args.committee !== undefined ? { committee: args.committee } : {}),
      ...(args.delegate !== undefined ? { delegate: args.delegate } : {}),
      ...(args.userId !== undefined ? { userId: args.userId } : {}),
      ...(args.class !== undefined ? { class: args.class } : {}),
    };

    const memberId = await ctx.db.insert("members", newMember);

    await getPostHog().capture(ctx, {
      event: "admin_create_member",
      properties: {
        createdMemberInfo: newMember,
        createdMemberId: memberId,
      },
    });
    return true;
  },
});

export const update = mutation({
  args: {
    id: v.id("members"),
    // Keep this up-to-date the table.
    userId: v.optional(v.string()),
    name: v.optional(v.string()),
    class: v.optional(v.string()),
    type: v.optional(memberTypes),
    committee: v.optional(v.optional(v.id("committees"))),
    delegate: v.optional(v.optional(v.string())),
  },
  async handler(ctx, args): Promise<null | Boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    // Permission check
    if (userInfo?.member?.type != "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "member.update",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    // Member Info
    const memberInfo = await ctx.runQuery(internal.members.get, {
      id: args.id,
    });

    if (!memberInfo) return null;

    const memberPatch: Partial<Omit<Doc<"members">, "_id" | "_creationTime">> =
      {
        type:
          args.type === "admin"
            ? memberInfo.type
            : (args.type ?? memberInfo.type),
        ...("committee" in args ? { committee: args.committee } : {}),
        ...("delegate" in args ? { delegate: args.delegate } : {}),
        ...("userId" in args ? { userId: args.userId } : {}),
        ...("class" in args ? { class: args.class } : {}),
        ...("name" in args ? { name: args.name } : {}),
      };

    await ctx.db.patch("members", args.id, memberPatch);

    await getPostHog().capture(ctx, {
      event: "admin_update_member",
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
    id: v.id("members"),
  },
  async handler(ctx, args): Promise<null | Boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type != "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "member.purge",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    await ctx.db.delete("members", args.id);
    await getPostHog().capture(ctx, {
      event: "admin_delete_member",
      properties: {
        id: args.id,
      },
    });
    return true;
  },
});
