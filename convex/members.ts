import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import { internalQuery, mutation, query } from "./_generated/server";

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
      return null;
    }

    const newMember: Omit<Doc<"members">, "_id" | "_creationTime"> = {
      type: args.type === "admin" ? "delegate" : args.type,
      name: args.name,
    };

    if (args.committee !== undefined) {
      newMember.committee = args.committee;
    }
    if (args.delegate !== undefined) {
      newMember.delegate = args.delegate;
    }
    if (args.userId !== undefined) {
      newMember.userId = args.userId;
    }
    if (args.class !== undefined) {
      newMember.class = args.class;
    }

    await ctx.db.insert("members", newMember);

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
    if (userInfo?.member?.type != "admin") return null;

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
      };

    if ("committee" in args) {
      memberPatch.committee = args.committee;
    }
    if ("delegate" in args) {
      memberPatch.delegate = args.delegate;
    }
    if ("userId" in args) {
      memberPatch.userId = args.userId;
    }
    if ("class" in args) {
      memberPatch.class = args.class;
    }
    if ("name" in args) {
      memberPatch.name = args.name;
    }

    await ctx.db.patch("members", args.id, memberPatch);

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
      return null;
    }

    await ctx.db.delete("members", args.id);
    return true;
  },
});
