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
import {
  getOperationalEventId,
  isEventInOperationalScope,
} from "./events";

export const attendanceStatus = v.union(
  v.literal("present"),
  v.literal("late"),
  v.literal("absent"),
);

type AttendanceTrackedMemberType = "delegate" | "logistics" | "press" | "clerk";

type AttendanceMemberSummary = Pick<
  Doc<"members">,
  "_id" | "name" | "type" | "tuitionId" | "delegatedCountry" | "committee"
>;

type ClassAttendanceMemberSummary = Pick<
  Doc<"members">,
  | "_id"
  | "name"
  | "type"
  | "tuitionId"
  | "schoolClass"
  | "delegatedCountry"
  | "committee"
> & {
  status: Doc<"attendanceEntries">["status"] | "unknown";
  attendanceNote?: string;
  attendanceUpdatedAt?: number;
  committeeTheme?: string;
};

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

export type ClassAttendanceReportData = {
  currentMember: Doc<"members">;
  dateKey: string;
  members: ClassAttendanceMemberSummary[];
};

const trackedMemberTypes: AttendanceTrackedMemberType[] = [
  "delegate",
  "logistics",
  "press",
  "clerk",
];

const lateDelegateDeduction = {
  kind: "deduction" as const,
  category: "late_arrival",
  amount: 0.1,
};

function getLateDelegateDeductionNote(dateKey: string) {
  return `Atraso registrado na presença de ${dateKey}.`;
}

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

function getCommitteeIdsForMember(member: Doc<"members">) {
  const committeeIds = new Set<Id<"committees">>();

  if (member.committee) {
    committeeIds.add(member.committee);
  }

  return [...committeeIds];
}

async function getAccessibleCommittees(
  ctx: QueryCtx | MutationCtx,
  actor: Doc<"members">,
) {
  const operationalEventId = await getOperationalEventId(ctx, actor);
  if (!operationalEventId) return null;

  if (actor.type === "admin") {
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
    return committees;
  }

  if (actor.type !== "logistics" && actor.type !== "clerk") {
    return null;
  }

  const committeeIds = getCommitteeIdsForMember(actor);
  const committees: Doc<"committees">[] = [];

  for (const committeeId of committeeIds) {
    const committee = await ctx.db.get("committees", committeeId);

    if (
      committee &&
      await isEventInOperationalScope(ctx, committee.eventId, operationalEventId)
    ) {
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
    if (
      isTrackedMemberType(member.type) &&
      member.eventId === committee.eventId
    ) {
      membersById.set(member._id, toMemberSummary(member));
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
      if (
        isTrackedMemberType(member.type) &&
        member.eventId === committee.eventId
      ) {
        membersById.set(member._id, member);
      }
    }
  }

  return [...membersById.values()];
}

async function getEntriesForMembers(
  ctx: QueryCtx,
  dateKey: string,
  members: Pick<Doc<"members">, "_id" | "eventId">[],
) {
  const entriesById = new Map<Id<"attendanceEntries">, Doc<"attendanceEntries">>();

  for (const member of members) {
    const entry = await ctx.db
      .query("attendanceEntries")
      .withIndex("by_member_and_dateKey", (q) =>
        q.eq("member", member._id).eq("dateKey", dateKey),
      )
      .unique();

    if (entry && entry.eventId === member.eventId) {
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

  const operationalEventId = await getOperationalEventId(ctx, actor);
  if (
    !operationalEventId ||
    !(await isEventInOperationalScope(
      ctx,
      targetMember.eventId,
      operationalEventId,
    ))
  ) {
    throw new Error("attendance_member_outside_event");
  }

  const targetCommitteeIds = getCommitteeIdsForMember(targetMember);
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

export const getClassReportData = query({
  args: {
    dateKey: v.optional(v.string()),
  },
  async handler(ctx, args): Promise<ClassAttendanceReportData | null> {
    const userInfo = await ctx.runQuery(api.auth.getCurrentUser);
    const actor = userInfo?.member ?? null;

    if (actor?.type !== "admin") {
      return null;
    }

    const dateKey = resolveDateKey(actor, args.dateKey);
    const operationalEventId = await getOperationalEventId(ctx, actor);
    if (!operationalEventId) return null;
    const [memberCandidates, attendanceCandidates, committeeCandidates] = await Promise.all([
      ctx.db.query("members").take(999),
      ctx.db
        .query("attendanceEntries")
        .withIndex("by_dateKey", (q) => q.eq("dateKey", dateKey))
        .take(999),
      ctx.db.query("committees").take(999),
    ]);
    const members: Doc<"members">[] = [];
    const attendanceEntries: Doc<"attendanceEntries">[] = [];
    const committees: Doc<"committees">[] = [];
    for (const member of memberCandidates) {
      if (await isEventInOperationalScope(ctx, member.eventId, operationalEventId)) {
        members.push(member);
      }
    }
    for (const entry of attendanceCandidates) {
      if (await isEventInOperationalScope(ctx, entry.eventId, operationalEventId)) {
        attendanceEntries.push(entry);
      }
    }
    for (const committee of committeeCandidates) {
      if (await isEventInOperationalScope(ctx, committee.eventId, operationalEventId)) {
        committees.push(committee);
      }
    }
    const entriesByMemberId = new Map<
      Id<"members">,
      Doc<"attendanceEntries">
    >();
    const committeesById = new Map(
      committees.map((committee) => [committee._id, committee]),
    );

    for (const entry of attendanceEntries) {
      entriesByMemberId.set(entry.member, entry);
    }

    return {
      currentMember: actor,
      dateKey,
      members: members
        .map((member) => {
          const entry = entriesByMemberId.get(member._id);
          const committee = member.committee
            ? committeesById.get(member.committee)
            : undefined;
          const status: ClassAttendanceMemberSummary["status"] =
            entry?.status ?? "unknown";

          return {
            _id: member._id,
            name: member.name,
            type: member.type,
            tuitionId: member.tuitionId,
            schoolClass: member.schoolClass,
            delegatedCountry: member.delegatedCountry,
            committee: member.committee,
            status,
            attendanceNote: entry?.note,
            attendanceUpdatedAt: entry?.updatedAt,
            committeeTheme: committee?.theme,
          };
        })
        .sort((leftMember, rightMember) => {
          const classComparison = (leftMember.schoolClass ?? "").localeCompare(
            rightMember.schoolClass ?? "",
            "pt-BR",
            { sensitivity: "base" },
          );

          if (classComparison !== 0) {
            return classComparison;
          }

          return leftMember.name.localeCompare(rightMember.name, "pt-BR", {
            sensitivity: "base",
          });
        }),
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
        eventId: member.eventId,
      };

      if (!nextEntry.eventId) {
        throw new Error("attendance_member_without_event");
      }

      if (existingEntry) {
        if (existingEntry.eventId !== nextEntry.eventId) {
          throw new Error("attendance_entry_outside_event");
        }
        await ctx.db.patch("attendanceEntries", existingEntry._id, nextEntry);
      } else {
        await ctx.db.insert("attendanceEntries", {
          member: member._id,
          dateKey,
          ...nextEntry,
        });
      }

      if (member.type === "delegate" && status === "late") {
        await ctx.db.insert("gradingEntries", {
          member: member._id,
          eventId: nextEntry.eventId,
          ...lateDelegateDeduction,
          note: getLateDelegateDeductionNote(dateKey),
        });
      }

      if (member.type === "delegate" && status === "present") {
        const lateDeductions = await ctx.db
          .query("gradingEntries")
          .withIndex("by_member_and_kind_and_category", (q) =>
            q
              .eq("member", member._id)
              .eq("kind", lateDelegateDeduction.kind)
              .eq("category", lateDelegateDeduction.category),
          )
          .take(999);

        for (const deduction of lateDeductions) {
          if (
            deduction.eventId === nextEntry.eventId &&
            deduction.note === getLateDelegateDeductionNote(dateKey)
          ) {
            await ctx.db.delete("gradingEntries", deduction._id);
          }
        }
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
        lateCount: targetMembers.filter(
          (member) => statusesByMemberId.get(member._id) === "late",
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
