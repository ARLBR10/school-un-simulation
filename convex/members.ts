import { v } from "convex/values";
import { countriesConvexSchema } from "@/lib/country-list";

import { api, internal } from "./_generated/api";
import { Doc } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getPostHog } from "./posthog";
import { resolveEventId } from "./events";

type MemberPatch = Partial<Omit<Doc<"members">, "_id" | "_creationTime">>;
type MemberCreateInput = Omit<Doc<"members">, "_id" | "_creationTime">;

type ClassAssignmentResult = {
  updated: number;
  missing: string[];
  duplicateRows: string[];
  duplicateMembers: string[];
};

export const memberTypes = v.union(
  v.literal("delegate"),
  v.literal("logistics"),
  v.literal("press"),
  v.literal("clerk"), // Clerk ~ "Mesário"
  v.literal("teacher"),
  v.literal("unassigned"),
  v.literal("admin"), // Coordenação, Secretary General, Meg Dev (@ARLBR10)
);

export const pressRoles = v.union(
  v.literal("writer"),
  v.literal("media"),
  v.literal("photographer"),
);

const memberCreateArgs = {
  // Keep this up-to-date with the members table.
  userId: v.optional(v.string()),
  name: v.string(),
  tuitionId: v.optional(v.string()),
  schoolClass: v.optional(v.string()),
  type: memberTypes,
  pressRole: v.optional(pressRoles),
  delegatedCountry: v.optional(countriesConvexSchema),
  committee: v.optional(v.id("committees")),
  eventId: v.optional(v.id("events")),
};

export const getByUserId = internalQuery({
  args: {
    userId: v.optional(v.string()),
  },
  async handler(ctx, args): Promise<{
    member: Doc<"members"> | null;
    memberships: Array<{
      member: Doc<"members">;
      event: Doc<"events"> | null;
    }>;
  }> {
    if (!args.userId) {
      return { member: null, memberships: [] };
    }

    const memberships = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(100);
    const adminMembership = memberships.find((member) => member.type === "admin");
    const activeEvent = await ctx.runQuery(internal.events.getActive, {});
    const member = adminMembership ??
      memberships.find((member) => member.eventId === activeEvent?._id) ??
      memberships.find((member) => member.eventId === undefined) ??
      null;
    const membershipHistory = await Promise.all(
      memberships.map(async (membership) => ({
        member: membership,
        event: membership.eventId
          ? await ctx.db.get("events", membership.eventId)
          : null,
      })),
    );

    membershipHistory.sort(
      (a, b) => (b.event?.year ?? 0) - (a.event?.year ?? 0),
    );

    return { member, memberships: membershipHistory };
  },
});

export const get = internalQuery({
  args: {
    id: v.id("members"),
  },
  async handler(ctx, args): Promise<null | Doc<"members">> {
    return ctx.db.get("members", args.id);
  },
});

export const assignStudentMembershipFromEmail = internalMutation({
  args: {
    userId: v.string(),
    email: v.string(),
    name: v.string(),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const activeEvent = await ctx.db
      .query("events")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .unique();
    if (!activeEvent) {
      return null;
    }

    const existingMemberships = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .take(100);
    if (
      existingMemberships.some(
        (member) =>
          member.type === "admin" || member.eventId === activeEvent._id,
      )
    ) {
      return null;
    }

    const emailLocalPart = args.email.slice(0, args.email.lastIndexOf("@"));
    const emailTuitionId = emailLocalPart.split(".").at(-1)?.trim();

    if (emailTuitionId) {
      const usersByTuitionId = await ctx.db
        .query("members")
        .withIndex("by_tuitionId", (q) => q.eq("tuitionId", emailTuitionId))
        .take(100);
      const userByTuitionId =
        usersByTuitionId.find(
          (member) => member.eventId === activeEvent._id,
        ) ??
        usersByTuitionId.find((member) => member.eventId === undefined);

      if (userByTuitionId && userByTuitionId.userId === undefined) {
        await ctx.db.patch("members", userByTuitionId._id, {
          userId: args.userId,
        });
        return null;
      }
    }

    const name = args.name.trim();
    await ctx.db.insert("members", {
      userId: args.userId,
      name: name || emailLocalPart,
      type: "unassigned",
      eventId: activeEvent._id,
    });

    return null;
  },
});

export const getAll = query({
  args: {},
  async handler(ctx): Promise<Doc<"members">[] | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    // Permission check
    if (userInfo?.member?.type != "admin") {
      return null;
    }

    return await ctx.db.query("members").take(999);
  },
});

// The admin type shouldn't be set by ANY mutation, that job should only occur at the Convex Admin

export const create = mutation({
  args: memberCreateArgs,
  async handler(ctx, args): Promise<null | boolean> {
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

    const newMember: MemberCreateInput = {
      type: args.type === "admin" ? "delegate" : args.type,
      ...(args.type === "press" && args.pressRole !== undefined
        ? { pressRole: args.pressRole }
        : {}),
      name: args.name,
      ...(args.delegatedCountry !== undefined
        ? { delegatedCountry: args.delegatedCountry }
        : {}),
      ...(args.committee !== undefined ? { committee: args.committee } : {}),
      ...(args.userId !== undefined ? { userId: args.userId } : {}),
      ...(args.tuitionId !== undefined ? { tuitionId: args.tuitionId } : {}),
      ...(args.schoolClass !== undefined ? { schoolClass: args.schoolClass } : {}),
      eventId: await resolveEventId(ctx, args.eventId),
    };

    await ensureMembershipDoesNotOverlap(ctx, newMember);

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

export const bulkCreate = mutation({
  args: {
    members: v.array(v.object(memberCreateArgs)),
  },
  async handler(ctx, args): Promise<null | { created: number }> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type != "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "member.bulkCreate",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: { count: args.members.length },
        },
      });
      return null;
    }

    if (args.members.length > 500) {
      throw new Error("Crie no máximo 500 membros por importação.");
    }

    for (const member of args.members) {
      const newMember: MemberCreateInput = {
        type: member.type === "admin" ? "delegate" : member.type,
        ...(member.type === "press" && member.pressRole !== undefined
          ? { pressRole: member.pressRole }
          : {}),
        name: member.name,
        ...(member.delegatedCountry !== undefined
          ? { delegatedCountry: member.delegatedCountry }
          : {}),
        ...(member.committee !== undefined ? { committee: member.committee } : {}),
        ...(member.userId !== undefined ? { userId: member.userId } : {}),
        ...(member.tuitionId !== undefined ? { tuitionId: member.tuitionId } : {}),
        ...(member.schoolClass !== undefined ? { schoolClass: member.schoolClass } : {}),
        eventId: await resolveEventId(ctx, member.eventId),
      };

      await ensureMembershipDoesNotOverlap(ctx, newMember);

      await ctx.db.insert("members", newMember);
    }

    await getPostHog().capture(ctx, {
      event: "admin_bulk_create_members",
      properties: {
        createdCount: args.members.length,
      },
    });

    return { created: args.members.length };
  },
});

export const update = mutation({
  args: {
    id: v.id("members"),
    // Keep this up-to-date the table.
    userId: v.optional(v.union(v.string(), v.null())),
    name: v.optional(v.string()),
    tuitionId: v.optional(v.union(v.string(), v.null())),
    schoolClass: v.optional(v.union(v.string(), v.null())),
    type: v.optional(memberTypes),
    pressRole: v.optional(v.union(pressRoles, v.null())),
    delegatedCountry: v.optional(v.union(countriesConvexSchema, v.null())),
    committee: v.optional(v.union(v.id("committees"), v.null())),
    eventId: v.optional(v.id("events")),
  },
  async handler(ctx, args): Promise<null | boolean> {
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

    const memberPatch: MemberPatch = {
      type:
        args.type === "admin"
          ? memberInfo.type
          : (args.type ?? memberInfo.type),
    };

    if ("delegatedCountry" in args) {
      memberPatch.delegatedCountry = args.delegatedCountry ?? undefined;
    }

    if ("pressRole" in args) {
      const nextType = memberPatch.type ?? memberInfo.type;
      memberPatch.pressRole = nextType === "press" ? (args.pressRole ?? undefined) : undefined;
    }

    if ("committee" in args) {
      memberPatch.committee = args.committee ?? undefined;
    }

    if ("userId" in args) {
      memberPatch.userId = args.userId ?? undefined;
    }

    if ("tuitionId" in args) {
      memberPatch.tuitionId = args.tuitionId ?? undefined;
    }

    if ("schoolClass" in args) {
      memberPatch.schoolClass = args.schoolClass ?? undefined;
    }

    if ("name" in args && args.name !== undefined) {
      memberPatch.name = args.name;
    }

    if (
      args.eventId !== undefined &&
      memberInfo.type !== "admin" &&
      memberInfo.eventId !== undefined &&
      memberInfo.eventId !== args.eventId
    ) {
      throw new Error(
        "O evento de uma participação não pode ser alterado. Crie uma nova participação.",
      );
    }

    if (args.eventId !== undefined && memberInfo.type !== "admin") {
      memberPatch.eventId = await resolveEventId(ctx, args.eventId);
    }

    await ensureMembershipDoesNotOverlap(
      ctx,
      { ...memberInfo, ...memberPatch },
      memberInfo._id,
    );

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

async function ensureMembershipDoesNotOverlap(
  ctx: Parameters<typeof resolveEventId>[0],
  membership: Pick<
    MemberCreateInput,
    "committee" | "eventId" | "tuitionId" | "userId"
  >,
  ignoredMemberId?: Doc<"members">["_id"],
) {
  if (!membership.eventId) return;

  if (membership.committee) {
    const committee = await ctx.db.get("committees", membership.committee);
    const event = await ctx.db.get("events", membership.eventId);
    const isLegacy2026Committee =
      committee?.eventId === undefined && event?.slug === "school-onu-2026";
    if (
      !committee ||
      (committee.eventId !== membership.eventId && !isLegacy2026Committee)
    ) {
      throw new Error("O comitê precisa pertencer ao mesmo evento do membro.");
    }
  }

  const possibleDuplicates = new Map<Doc<"members">["_id"], Doc<"members">>();
  if (membership.userId) {
    const byUser = await ctx.db
      .query("members")
      .withIndex("by_userId", (q) => q.eq("userId", membership.userId))
      .take(100);
    for (const member of byUser) possibleDuplicates.set(member._id, member);
  }
  if (membership.tuitionId) {
    const byTuition = await ctx.db
      .query("members")
      .withIndex("by_tuitionId", (q) => q.eq("tuitionId", membership.tuitionId))
      .take(100);
    for (const member of byTuition) possibleDuplicates.set(member._id, member);
  }

  const overlap = [...possibleDuplicates.values()].find(
    (member) =>
      member._id !== ignoredMemberId &&
      (member.type === "admin" || member.eventId === membership.eventId),
  );
  if (overlap) {
    throw new Error("Este participante já possui uma função neste evento.");
  }
}

export const assignClasses = mutation({
  args: {
    eventId: v.optional(v.id("events")),
    schoolClass: v.string(),
    rows: v.array(v.object({
      number: v.optional(v.string()),
      tuitionId: v.string(),
      studentName: v.string(),
    })),
  },
  async handler(ctx, args): Promise<null | ClassAssignmentResult> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);

    if (userInfo?.member?.type != "admin") {
      await getPostHog().capture(ctx, {
        event: "permission_denied",
        properties: {
          mutation: "member.assignClasses",
          user_type_required: "admin",
          memberId: userInfo?.member?._id,
          memberType: userInfo?.member?.type,
          dataReceived: { count: args.rows.length },
        },
      });
      return null;
    }

    if (args.rows.length === 0) {
      throw new Error("Informe pelo menos um aluno para vincular à turma.");
    }

    if (args.rows.length > 500) {
      throw new Error("Atualize no máximo 500 membros por importação.");
    }

    const normalizedClass = args.schoolClass.trim();
    const eventId = await resolveEventId(ctx, args.eventId);
    const targetEvent = await ctx.db.get("events", eventId);

    if (!normalizedClass) {
      throw new Error("Informe o nome da turma no título do Markdown.");
    }

    const tuitionCounts = new Map<string, number>();

    for (const row of args.rows) {
      const tuitionId = row.tuitionId.trim();
      tuitionCounts.set(tuitionId, (tuitionCounts.get(tuitionId) ?? 0) + 1);
    }

    const duplicateRows = [...tuitionCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([tuitionId]) => tuitionId);
    const duplicateRowSet = new Set(duplicateRows);
    const missing: string[] = [];
    const duplicateMembers: string[] = [];
    let updated = 0;

    for (const row of args.rows) {
      const tuitionId = row.tuitionId.trim();

      if (!tuitionId || duplicateRowSet.has(tuitionId)) {
        continue;
      }

      const matches = (await ctx.db
        .query("members")
        .withIndex("by_tuitionId", (q) => q.eq("tuitionId", tuitionId))
        .take(100))
        .filter(
          (member) =>
            member.eventId === eventId ||
            (member.eventId === undefined && targetEvent?.slug === "school-onu-2026"),
        )
        .slice(0, 2);

      if (matches.length === 0) {
        missing.push(`${row.studentName} (${tuitionId})`);
        continue;
      }

      if (matches.length > 1) {
        duplicateMembers.push(`${row.studentName} (${tuitionId})`);
        continue;
      }

      await ctx.db.patch("members", matches[0]._id, {
        schoolClass: normalizedClass,
      });
      updated += 1;
    }

    await getPostHog().capture(ctx, {
      event: "admin_assign_member_classes",
      properties: {
        schoolClass: normalizedClass,
        updatedCount: updated,
        missingCount: missing.length,
        duplicateRowCount: duplicateRows.length,
        duplicateMemberCount: duplicateMembers.length,
        warnings: {
          missing,
          duplicateRows,
          duplicateMembers,
        },
      },
    });

    return { updated, missing, duplicateRows, duplicateMembers };
  },
});

export const purge = mutation({
  args: {
    id: v.id("members"),
  },
  async handler(ctx, args): Promise<null | boolean> {
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

    const member = await ctx.db.get("members", args.id);
    if (!member) return null;

    await ctx.db.delete("members", args.id);
    await getPostHog().capture(ctx, {
      event: "admin_delete_member",
      properties: {
        id: args.id,
        deletedMember: {
          id: member._id,
          eventId: member.eventId ?? null,
          type: member.type,
        },
      },
    });
    return true;
  },
});
