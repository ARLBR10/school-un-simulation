type MembershipInfo = {
  member: unknown | null;
  memberships: readonly unknown[];
};

export type MembershipRepairStatus =
  | "idle"
  | "pending"
  | "ready"
  | "ineligible"
  | "unavailable"
  | "error";

export function shouldEnsureStudentMembership(
  userId: string | undefined,
  userInfo: MembershipInfo | null | undefined,
  attemptedUserId: string | null,
) {
  return Boolean(
    userId &&
      userInfo &&
      !userInfo.member &&
      attemptedUserId !== userId,
  );
}

export function shouldRedirectAfterMembershipRepair(
  status: MembershipRepairStatus,
  repairUserId: string | null,
  currentUserId: string,
) {
  return (
    repairUserId === currentUserId &&
    (status === "ineligible" || status === "unavailable" || status === "error")
  );
}

export function isMembershipRepairCurrent(
  repairUserId: string,
  currentUserId: string | undefined,
) {
  return repairUserId === currentUserId;
}