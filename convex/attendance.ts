import { v } from "convex/values";

import { api } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { getPostHog } from "./posthog";

export const attendanceStatus = v.union(
  v.literal("present"),
  v.literal("absent"),
);

type AttendanceTrackedMemberType = "delegate" | "logistics" | "press" | "clerk";

type AttendanceMemberSummary = Pick<
  Doc<"members">,
  "_id" | "name" | "type" | "tuitionId" | "delegatedCountry" | "committee"
>;

export type AttendanceCommitteeSummary = Pick<
  Doc<"committees">,
  "_id" | "theme"
> & {
  members: AttendanceMemberSummary[];
};

export type AttendanceManageData = {
  currentMember: Doc<"members">;
  dateKey: string;
  committees: AttendanceCommitteeSummary[];
  entries: Doc<"attendanceEntries">[];
  isAdmin: boolean;
};

const trackedMemberTypes: AttendanceTrackedMemberType[] = [
  "delegate",
  "logistics",
  "press",
  "clerk",
];

function getTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isValidDateKey(dateKey: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateKey);
}

function resolveDateKey(actor: Doc<"members">, dateKey: string | undefined) {
  if (actor.type === "admin" && dateKey && isValidDateKey(dateKey)) {
    return dateKey;
  }

  return getTodayDateKey();
}

function isTrackedMemberType(
  type: Doc<"members">["type"],
): type is AttendanceTrackedMemberType {
  return trackedMemberTypes.includes(type as AttendanceTrackedMemberType);
}

function toMemberSummary(member: Doc<"members">): AttendanceMemberSummary {
  return {
    _id: member._id,
    name: member.name,
    type: member.type,
    tuitionId: member.tuitionId,
    delegatedCountry: member.delegatedCountry,
    committee: member.committee,
  };
}

async function getCommitteeIdsForMember(
  ctx: QueryCtx | MutationCtx,
  member: Doc<"members">,
) {
  const committeeIds = new Set<Id<"committees">>();

  if (member.committee) {
    committeeIds.add(member.committee);
  }

  if (member.type === "clerk") {
    const committees = await ctx.db.query("committees").take(999);

    for (const committee of committees) {
      if (committee.clerks.some((clerkId) => clerkId === member._id)) {
        committeeIds.add(committee._id);
      }
    }
  }

  return [...committeeIds];
}

async function getAccessibleCommittees(
  ctx: QueryCtx | MutationCtx,
  actor: Doc<"members">,
) {
  if (actor.type === "admin") {
    return await ctx.db.query("committees").take(999);
  }

  if (actor.type !== "logistics" && actor.type !== "clerk") {
    return null;
  }

  const committeeIds = await getCommitteeIdsForMember(ctx, actor);
  const committees: Doc<"committees">[] = [];

  for (const committeeId of committeeIds) {
    const committee = await ctx.db.get("committees", committeeId);

    if (committee) {
      committees.push(committee);
    }
  }

  return committees;
}

async function getCommitteeMembers(ctx: QueryCtx, committee: Doc<"committees">) {
  const membersById = new Map<Id<"members">, AttendanceMemberSummary>();
  const assignedMembers = await ctx.db
    .query("members")
    .withIndex("by_committee", (q) => q.eq("committee", committee._id))
    .take(999);

  for (const member of assignedMembers) {
    if (isTrackedMemberType(member.type)) {
      membersById.set(member._id, toMemberSummary(member));
    }
  }

  for (const clerkId of committee.clerks) {
    const clerk = await ctx.db.get("members", clerkId);

    if (clerk && isTrackedMemberType(clerk.type)) {
      membersById.set(clerk._id, toMemberSummary(clerk));
    }
  }

  return [...membersById.values()].sort((leftMember, rightMember) =>
    leftMember.name.localeCompare(rightMember.name, "pt-BR", {
      sensitivity: "base",
    }),
  );
}

async function getMembersForCommittees(
  ctx: QueryCtx | MutationCtx,
  committees: Doc<"committees">[],
) {
  const membersById = new Map<Id<"members">, Doc<"members">>();

  for (const committee of committees) {
    const assignedMembers = await ctx.db
      .query("members")
      .withIndex("by_committee", (q) => q.eq("committee", committee._id))
      .take(999);

    for (const member of assignedMembers) {
      if (isTrackedMemberType(member.type)) {
        membersById.set(member._id, member);
      }
    }

    for (const clerkId of committee.clerks) {
      const clerk = await ctx.db.get("members", clerkId);

      if (clerk && isTrackedMemberType(clerk.type)) {
        membersById.set(clerk._id, clerk);
      }
    }
  }

  return [...membersById.values()];
}

async function getEntriesForMembers(
  ctx: QueryCtx,
  dateKey: string,
  members: Pick<Doc<"members">, "_id">[],
) {
  const entriesById = new Map<Id<"attendanceEntries">, Doc<"attendanceEntries">>();

  for (const member of members) {
    const entry = await ctx.db
      .query("attendanceEntries")
      .withIndex("by_member_and_dateKey", (q) =>
        q.eq("member", member._id).eq("dateKey", dateKey),
      )
      .unique();

    if (entry) {
      entriesById.set(entry._id, entry);
    }
  }

  return [...entriesById.values()];
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
      user_type_required: "attendance_admin_logistics_or_clerk",
      memberId: actor?._id,
      memberType: actor?.type,
      reason,
      dataReceived,
    },
  });
}

async function getAuthorizedAttendanceActor(
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

  const committees = await getAccessibleCommittees(ctx, actor);

  if (!committees) {
    await logPermissionDenied({
      ctx,
      mutationName,
      actor,
      dataReceived,
      reason: "member_type_not_allowed",
    });
    return null;
  }

  return { actor, committees };
}

async function resolveAuthorizedTargetCommittee({
  ctx,
  actor,
  targetMember,
  accessibleCommittees,
  mutationName,
  dataReceived,
}: {
  ctx: MutationCtx;
  actor: Doc<"members">;
  targetMember: Doc<"members">;
  accessibleCommittees: Doc<"committees">[];
  mutationName: string;
  dataReceived: unknown;
}) {
  if (!isTrackedMemberType(targetMember.type)) {
    throw new Error("attendance_member_type_not_tracked");
  }

  const targetCommitteeIds = await getCommitteeIdsForMember(ctx, targetMember);
  const accessibleCommitteeIds = new Set(
    accessibleCommittees.map((committee) => committee._id),
  );
  const matchingCommitteeId = targetCommitteeIds.find((committeeId) =>
    actor.type === "admin" ? true : accessibleCommitteeIds.has(committeeId),
  );

  if (!matchingCommitteeId) {
    await logPermissionDenied({
      ctx,
      mutationName,
      actor,
      dataReceived,
      reason: "member_outside_attendance_scope",
    });
    throw new Error("attendance_member_outside_scope");
  }

  return matchingCommitteeId;
}

export const getManageData = query({
  args: {
    dateKey: v.optional(v.string()),
  },
  async handler(ctx, args): Promise<AttendanceManageData | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);
    const actor = userInfo?.member ?? null;

    if (!actor) {
      return null;
    }

    const accessibleCommittees = await getAccessibleCommittees(ctx, actor);

    if (!accessibleCommittees) {
      return null;
    }

    const dateKey = resolveDateKey(actor, args.dateKey);
    const committees: AttendanceCommitteeSummary[] = [];
    const membersById = new Map<Id<"members">, AttendanceMemberSummary>();

    for (const committee of accessibleCommittees) {
      const members = await getCommitteeMembers(ctx, committee);

      for (const member of members) {
        membersById.set(member._id, member);
      }

      committees.push({
        _id: committee._id,
        theme: committee.theme,
        members,
      });
    }

    const entries = await getEntriesForMembers(
      ctx,
      dateKey,
      [...membersById.values()],
    );

    return {
      currentMember: actor,
      dateKey,
      committees,
      entries,
      isAdmin: actor.type === "admin",
    };
  },
});

export const saveStatuses = mutation({
  args: {
    committee: v.id("committees"),
    dateKey: v.optional(v.string()),
    statuses: v.array(
      v.object({
        member: v.id("members"),
        status: attendanceStatus,
      }),
    ),
  },
  async handler(ctx, args): Promise<null | boolean> {
    const authorization = await getAuthorizedAttendanceActor(
      ctx,
      "attendance.saveStatuses",
      args,
    );

    if (!authorization) {
      return null;
    }

    const dateKey = resolveDateKey(authorization.actor, args.dateKey);
    const accessibleCommittee = authorization.committees.find(
      (committee) => committee._id === args.committee,
    );

    if (!accessibleCommittee) {
      await logPermissionDenied({
        ctx,
        mutationName: "attendance.saveStatuses",
        actor: authorization.actor,
        dataReceived: args,
        reason: "committee_outside_attendance_scope",
      });
      throw new Error("attendance_committee_outside_scope");
    }

    const targetMembers = await getMembersForCommittees(ctx, [accessibleCommittee]);
    const requiredMemberIds = new Set(targetMembers.map((member) => member._id));
    const statusesByMemberId = new Map<
      Id<"members">,
      Doc<"attendanceEntries">["status"]
    >();

    for (const status of args.statuses) {
      if (!requiredMemberIds.has(status.member)) {
        await logPermissionDenied({
          ctx,
          mutationName: "attendance.saveStatuses",
          actor: authorization.actor,
          dataReceived: args,
          reason: "member_outside_attendance_scope",
        });
        throw new Error("attendance_member_outside_scope");
      }

      if (statusesByMemberId.has(status.member)) {
        throw new Error("attendance_duplicate_member_status");
      }

      statusesByMemberId.set(status.member, status.status);
    }

    if (statusesByMemberId.size !== requiredMemberIds.size) {
      throw new Error("attendance_incomplete_statuses");
    }

    for (const member of targetMembers) {
      const status = statusesByMemberId.get(member._id);

      if (!status) {
        throw new Error("attendance_incomplete_statuses");
      }

      const committee = await resolveAuthorizedTargetCommittee({
        ctx,
        actor: authorization.actor,
        targetMember: member,
        accessibleCommittees: authorization.committees,
        mutationName: "attendance.saveStatuses",
        dataReceived: args,
      });
      const existingEntry = await ctx.db
        .query("attendanceEntries")
        .withIndex("by_member_and_dateKey", (q) =>
          q.eq("member", member._id).eq("dateKey", dateKey),
        )
        .unique();
      const nextEntry = {
        committee,
        status,
        updatedAt: Date.now(),
      };

      if (existingEntry) {
        await ctx.db.patch("attendanceEntries", existingEntry._id, nextEntry);
      } else {
        await ctx.db.insert("attendanceEntries", {
          member: member._id,
          dateKey,
          ...nextEntry,
        });
      }
    }

    await getPostHog().capture(ctx, {
      event: `${authorization.actor.type}_save_attendance_batch`,
      properties: {
        actorId: authorization.actor._id,
        actorType: authorization.actor.type,
        committeeId: accessibleCommittee._id,
        dateKey,
        memberCount: targetMembers.length,
        presentCount: targetMembers.filter(
          (member) => statusesByMemberId.get(member._id) === "present",
        ).length,
        absentCount: targetMembers.filter(
          (member) => statusesByMemberId.get(member._id) === "absent",
        ).length,
        statuses: targetMembers.map((member) => ({
          memberId: member._id,
          status: statusesByMemberId.get(member._id),
        })),
      },
    });

    return true;
  },
});
