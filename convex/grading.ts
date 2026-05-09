import { v } from "convex/values";

import { getCategoryDefinition } from "@/lib/grading-categories";

import { api } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { getPostHog } from "./posthog";

export const gradingEntryKind = v.union(
  v.literal("grade"),
  v.literal("deduction"),
);

function getGradingAuditSnapshot(entry: Doc<"gradingEntries">) {
  return {
    id: entry._id,
    createdAt: entry._creationTime,
    member: entry.member,
    kind: entry.kind,
    category: entry.category,
    amount: entry.amount,
    note: entry.note ?? null,
  };
}

function normalizeOptionalString(value: string | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue;
}

async function validateGradingEntry(
  ctx: MutationCtx,
  entry: Pick<Doc<"gradingEntries">, "member" | "kind" | "category" | "amount">,
) {
  if (entry.amount < 0) {
    throw new Error("Grading entry amount cannot be negative.");
  }

  const member = await ctx.db.get(entry.member);
  if (!member) {
    throw new Error("Grading entry member does not exist.");
  }

  const category = getCategoryDefinition(entry.kind, entry.category);
  if (!category || !category.memberTypes.includes(member.type)) {
    throw new Error("Grading entry category is not available for this member.");
  }

  if (entry.amount > category.maxAmount) {
    throw new Error("Grading entry amount exceeds the category maximum.");
  }
}

export const getAll = query({
  args: {},
  async handler(ctx): Promise<Doc<"gradingEntries">[] | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type !== "admin") {
      return null;
    }

    return await ctx.db.query("gradingEntries").order("desc").take(999);
  },
});

export const create = mutation({
  args: {
    member: v.id("members"),
    kind: gradingEntryKind,
    category: v.string(),
    amount: v.number(),
    note: v.optional(v.string()),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type !== "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "grading.create",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const category = args.category.trim();
    await validateGradingEntry(ctx, { ...args, category });

    const entryId = await ctx.db.insert("gradingEntries", {
      member: args.member,
      kind: args.kind,
      category,
      amount: args.amount,
      ...(normalizeOptionalString(args.note) !== undefined
        ? { note: normalizeOptionalString(args.note) }
        : {}),
    });
    const createdEntry = await ctx.db.get(entryId);

    await getPostHog().capture(ctx, {
      event: `admin_create_${args.kind}`,
      properties: {
        entryId,
        after: createdEntry ? getGradingAuditSnapshot(createdEntry) : args,
      },
    });

    return true;
  },
});

export const update = mutation({
  args: {
    id: v.id("gradingEntries"),
    member: v.optional(v.id("members")),
    kind: v.optional(gradingEntryKind),
    category: v.optional(v.string()),
    amount: v.optional(v.number()),
    note: v.optional(v.string()),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type !== "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "grading.update",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const existingEntry = await ctx.db.get(args.id);
    if (!existingEntry) {
      return null;
    }

    const nextEntry = {
      member: args.member ?? existingEntry.member,
      kind: args.kind ?? existingEntry.kind,
      category: args.category?.trim() ?? existingEntry.category,
      amount: args.amount ?? existingEntry.amount,
    };
    await validateGradingEntry(ctx, nextEntry);

    const normalizedNote = normalizeOptionalString(args.note);
    const entryPatch: Partial<
      Omit<Doc<"gradingEntries">, "_id" | "_creationTime">
    > = {
      ...("member" in args ? { member: args.member } : {}),
      ...("kind" in args ? { kind: args.kind } : {}),
      ...("category" in args ? { category: nextEntry.category } : {}),
      ...("amount" in args ? { amount: args.amount } : {}),
      ...("note" in args ? { note: normalizedNote } : {}),
    };

    await ctx.db.patch(args.id, entryPatch);
    const updatedEntry = await ctx.db.get(args.id);

    await getPostHog().capture(ctx, {
      event: `admin_update_${existingEntry.kind}`,
      properties: {
        entryId: args.id,
        before: getGradingAuditSnapshot(existingEntry),
        after: updatedEntry ? getGradingAuditSnapshot(updatedEntry) : null,
      },
    });

    return true;
  },
});

export const purge = mutation({
  args: {
    id: v.id("gradingEntries"),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type !== "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "grading.purge",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: args,
        },
      });
      return null;
    }

    const existingEntry = await ctx.db.get(args.id);
    if (!existingEntry) {
      return null;
    }

    await ctx.db.delete(args.id);
    await getPostHog().capture(ctx, {
      event: `admin_delete_${existingEntry.kind}`,
      properties: {
        entryId: args.id,
        before: getGradingAuditSnapshot(existingEntry),
        after: null,
      },
    });

    return true;
  },
});
