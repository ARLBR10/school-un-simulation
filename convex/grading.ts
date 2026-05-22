import { v } from "convex/values";

import {
  canGraderUseCategory,
  getAllowedMemberTypesForGraderType,
  getCategoryDefinition,
  type GradingMemberType,
} from "@/lib/grading-categories";

import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { getPostHog } from "./posthog";

export const gradingEntryKind = v.union(
  v.literal("grade"),
  v.literal("deduction"),
);

type GradingAccessScope = {
  isAdmin: boolean;
  isAllowedGrader: boolean;
  isCommitteeScoped: boolean;
  committeeIds: Id<"committees">[];
};

export type GradingManageData = {
  currentMember: Doc<"members">;
  members: Doc<"members">[];
  entries: Doc<"gradingEntries">[];
  committees: Pick<Doc<"committees">, "_id" | "theme">[];
  isAdmin: boolean;
  isCommitteeScoped: boolean;
};

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

function resolveGradingEntryAmount(
  entry: Pick<Doc<"gradingEntries">, "kind" | "category" | "amount">,
) {
  const category = getCategoryDefinition(entry.kind, entry.category);

  if (entry.kind === "deduction" && category) {
    return category.maxAmount;
  }

  return entry.amount;
}

async function getAssignedCommitteeIds(
  ctx: QueryCtx | MutationCtx,
  actor: Doc<"members">,
) {
  const assignedCommitteeIds = new Set<Id<"committees">>();

  if (actor.committee) {
    assignedCommitteeIds.add(actor.committee);
  }

  if (actor.type === "clerk") {
    const committees = await ctx.db.query("committees").take(999);

    for (const committee of committees) {
      if (committee.clerks.some((clerkId) => clerkId === actor._id)) {
        assignedCommitteeIds.add(committee._id);
      }
    }
  }

  return [...assignedCommitteeIds];
}

async function getGradingAccessScope(
  ctx: QueryCtx | MutationCtx,
  actor: Doc<"members">,
): Promise<GradingAccessScope> {
  const isAdmin = actor.type === "admin";
  const allowedMemberTypes = getAllowedMemberTypesForGraderType(
    actor.type as GradingMemberType,
    isAdmin,
  );
  const committeeIds = isAdmin ? [] : await getAssignedCommitteeIds(ctx, actor);

  return {
    isAdmin,
    isAllowedGrader: isAdmin || allowedMemberTypes.length > 0,
    isCommitteeScoped:
      !isAdmin && (actor.type === "clerk" || actor.committee !== undefined),
    committeeIds,
  };
}

function isMemberInScope(member: Doc<"members">, scope: GradingAccessScope) {
  if (scope.isAdmin || !scope.isCommitteeScoped) {
    return true;
  }

  if (!member.committee) {
    return false;
  }

  return scope.committeeIds.some((committeeId) => committeeId === member.committee);
}

async function getManageableMembers(
  ctx: QueryCtx,
  actor: Doc<"members">,
  scope: GradingAccessScope,
) {
  const manageableMemberTypes = getAllowedMemberTypesForGraderType(
    actor.type as GradingMemberType,
    scope.isAdmin,
  );
  const membersById = new Map<Id<"members">, Doc<"members">>();

  for (const memberType of manageableMemberTypes) {
    const members = await ctx.db
      .query("members")
      .withIndex("by_type", (q) => q.eq("type", memberType))
      .take(999);

    for (const member of members) {
      if (isMemberInScope(member, scope)) {
        membersById.set(member._id, member);
      }
    }
  }

  return [...membersById.values()];
}

async function getEntriesForMembers(
  ctx: QueryCtx,
  actor: Doc<"members">,
  scope: GradingAccessScope,
  members: Doc<"members">[],
) {
  const entries: Doc<"gradingEntries">[] = [];

  for (const member of members) {
    const memberEntries = await ctx.db
      .query("gradingEntries")
      .withIndex("by_member", (q) => q.eq("member", member._id))
      .order("desc")
      .take(999);

    for (const entry of memberEntries) {
      const category = getCategoryDefinition(entry.kind, entry.category);

      if (
        category &&
        canGraderUseCategory(category, actor.type as GradingMemberType, scope.isAdmin)
      ) {
        entries.push(entry);
      }
    }
  }

  return entries.sort((leftEntry, rightEntry) => {
    return rightEntry._creationTime - leftEntry._creationTime;
  });
}

async function getManageDataCommittees(
  ctx: QueryCtx,
  scope: GradingAccessScope,
  members: Doc<"members">[],
) {
  const committeeIds = new Set<Id<"committees">>(scope.committeeIds);
  const committees: Pick<Doc<"committees">, "_id" | "theme">[] = [];

  for (const member of members) {
    if (member.committee) {
      committeeIds.add(member.committee);
    }
  }

  for (const committeeId of committeeIds) {
    const committee = await ctx.db.get("committees", committeeId);

    if (committee) {
      committees.push({ _id: committee._id, theme: committee.theme });
    }
  }

  return committees;
}

async function logPermissionDenied({
  ctx,
  mutationName,
  actor,
  dataReceived,
  reason,
}: {
  ctx: MutationCtx;
  mutationName: string;
  actor: Doc<"members"> | null | undefined;
  dataReceived: unknown;
  reason: string;
}) {
  await getPostHog().capture(ctx, {
    event: "permission_denied",
    properties: {
      mutation: mutationName,
      user_type_required: "grading_grader_or_admin",
      memberId: actor?._id,
      memberType: actor?.type,
      reason,
      dataReceived,
    },
  });
}

async function getAuthorizedGradingActor(
  ctx: MutationCtx,
  mutationName: string,
  dataReceived: unknown,
) {
  const userInfo = await ctx.runQuery(api.auth.getCurrentUser);
  const actor = userInfo?.member ?? null;

  if (!actor) {
    await logPermissionDenied({
      ctx,
      mutationName,
      actor,
      dataReceived,
      reason: "missing_member",
    });
    return null;
  }

  const scope = await getGradingAccessScope(ctx, actor);

  if (!scope.isAllowedGrader) {
    await logPermissionDenied({
      ctx,
      mutationName,
      actor,
      dataReceived,
      reason: "member_type_not_allowed",
    });
    return null;
  }

  return { actor, scope };
}

async function validateGradingEntry(
  ctx: MutationCtx,
  actor: Doc<"members">,
  scope: GradingAccessScope,
  mutationName: string,
  entry: Pick<Doc<"gradingEntries">, "member" | "kind" | "category" | "amount">,
) {
  if (entry.amount < 0) {
    throw new Error("Grading entry amount cannot be negative.");
  }

  const member = await ctx.db.get("members", entry.member);
  if (!member) {
    throw new Error("Grading entry member does not exist.");
  }

  if (!isMemberInScope(member, scope)) {
    await logPermissionDenied({
      ctx,
      mutationName,
      actor,
      dataReceived: entry,
      reason: "member_outside_committee_scope",
    });
    throw new Error("This member is outside your grading scope.");
  }

  const category = getCategoryDefinition(entry.kind, entry.category);
  if (!category || !category.memberTypes.includes(member.type as GradingMemberType)) {
    throw new Error("Grading entry category is not available for this member.");
  }

  if (!canGraderUseCategory(category, actor.type as GradingMemberType, scope.isAdmin)) {
    await logPermissionDenied({
      ctx,
      mutationName,
      actor,
      dataReceived: entry,
      reason: "category_not_available_for_grader",
    });
    throw new Error("This category is not available for your role.");
  }

  if (entry.amount > category.maxAmount) {
    throw new Error("Grading entry amount exceeds the category maximum.");
  }
}

async function ensureUniqueGradingEntry(
  ctx: MutationCtx,
  entry: Pick<Doc<"gradingEntries">, "member" | "kind" | "category">,
  ignoredEntryId?: Id<"gradingEntries">,
) {
  const duplicateEntry = await ctx.db
    .query("gradingEntries")
    .withIndex("by_member_and_kind_and_category", (q) =>
      q
        .eq("member", entry.member)
        .eq("kind", entry.kind)
        .eq("category", entry.category),
    )
    .first();

  if (duplicateEntry && duplicateEntry._id !== ignoredEntryId) {
    throw new Error("duplicate_grading_entry");
  }
}

async function logGradingAction({
  ctx,
  actor,
  action,
  before,
  after,
}: {
  ctx: MutationCtx;
  actor: Doc<"members">;
  action: "create" | "update" | "delete";
  before: ReturnType<typeof getGradingAuditSnapshot> | null;
  after: ReturnType<typeof getGradingAuditSnapshot> | null;
}) {
  const snapshot = after ?? before;

  if (!snapshot) {
    return;
  }

  await getPostHog().capture(ctx, {
    event: `${actor.type}_${action}_${snapshot.kind}`,
    properties: {
      actorId: actor._id,
      actorType: actor.type,
      entryId: snapshot.id,
      memberId: snapshot.member,
      kind: snapshot.kind,
      before,
      after,
    },
  });
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

export const getManageData = query({
  args: {},
  async handler(ctx): Promise<GradingManageData | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);
    const actor = userInfo?.member ?? null;

    if (!actor) {
      return null;
    }

    const scope = await getGradingAccessScope(ctx, actor);

    if (!scope.isAllowedGrader) {
      return null;
    }

    const members = await getManageableMembers(ctx, actor, scope);
    const entries = await getEntriesForMembers(ctx, actor, scope, members);
    const committees = await getManageDataCommittees(ctx, scope, members);

    return {
      currentMember: actor,
      members,
      entries,
      committees,
      isAdmin: scope.isAdmin,
      isCommitteeScoped: scope.isCommitteeScoped,
    };
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
    const authorization = await getAuthorizedGradingActor(
      ctx,
      "grading.create",
      args,
    );

    if (!authorization) {
      return null;
    }

    const { actor, scope } = authorization;
    const category = args.category.trim();
    const amount = resolveGradingEntryAmount({ ...args, category });
    await validateGradingEntry(
      ctx,
      actor,
      scope,
      "grading.create",
      { ...args, category, amount },
    );
    await ensureUniqueGradingEntry(ctx, { ...args, category });

    const entryId = await ctx.db.insert("gradingEntries", {
      member: args.member,
      kind: args.kind,
      category,
      amount,
      ...(normalizeOptionalString(args.note) !== undefined
        ? { note: normalizeOptionalString(args.note) }
        : {}),
    });
    const createdEntry = await ctx.db.get("gradingEntries", entryId);

    await logGradingAction({
      ctx,
      actor,
      action: "create",
      before: null,
      after: createdEntry ? getGradingAuditSnapshot(createdEntry) : null,
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
    const authorization = await getAuthorizedGradingActor(
      ctx,
      "grading.update",
      args,
    );

    if (!authorization) {
      return null;
    }

    const { actor, scope } = authorization;
    const existingEntry = await ctx.db.get("gradingEntries", args.id);
    if (!existingEntry) {
      return null;
    }

    const nextEntry = {
      member: args.member ?? existingEntry.member,
      kind: args.kind ?? existingEntry.kind,
      category: args.category?.trim() ?? existingEntry.category,
      amount: args.amount ?? existingEntry.amount,
    };
    nextEntry.amount = resolveGradingEntryAmount(nextEntry);
    await validateGradingEntry(
      ctx,
      actor,
      scope,
      "grading.update",
      nextEntry,
    );
    await ensureUniqueGradingEntry(ctx, nextEntry, args.id);

    const normalizedNote = normalizeOptionalString(args.note);
    const entryPatch: Partial<
      Omit<Doc<"gradingEntries">, "_id" | "_creationTime">
    > = {
      ...("member" in args ? { member: args.member } : {}),
      ...("kind" in args ? { kind: args.kind } : {}),
      ...("category" in args ? { category: nextEntry.category } : {}),
      ...("amount" in args || nextEntry.kind === "deduction"
        ? { amount: nextEntry.amount }
        : {}),
      ...("note" in args ? { note: normalizedNote } : {}),
    };

    await ctx.db.patch("gradingEntries", args.id, entryPatch);
    const updatedEntry = await ctx.db.get("gradingEntries", args.id);

    await logGradingAction({
      ctx,
      actor,
      action: "update",
      before: getGradingAuditSnapshot(existingEntry),
      after: updatedEntry ? getGradingAuditSnapshot(updatedEntry) : null,
    });

    return true;
  },
});

export const purge = mutation({
  args: {
    id: v.id("gradingEntries"),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const authorization = await getAuthorizedGradingActor(
      ctx,
      "grading.purge",
      args,
    );

    if (!authorization) {
      return null;
    }

    const { actor, scope } = authorization;
    const existingEntry = await ctx.db.get("gradingEntries", args.id);
    if (!existingEntry) {
      return null;
    }

    await validateGradingEntry(
      ctx,
      actor,
      scope,
      "grading.purge",
      existingEntry,
    );

    await ctx.db.delete("gradingEntries", args.id);
    await logGradingAction({
      ctx,
      actor,
      action: "delete",
      before: getGradingAuditSnapshot(existingEntry),
      after: null,
    });

    return true;
  },
});
