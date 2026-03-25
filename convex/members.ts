import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

export const getMemberInfo = internalQuery({
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
