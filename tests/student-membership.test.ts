import { describe, expect, test } from "bun:test";

import {
  isMembershipRepairCurrent,
  shouldEnsureStudentMembership,
  shouldRedirectAfterMembershipRepair,
} from "../lib/student-membership";

const historicalMembershipInfo = {
  member: null,
  memberships: [{ member: { _id: "old-membership" } }],
};

describe("student membership access", () => {
  test("repairs a missing current membership even when historical memberships exist", () => {
    expect(
      shouldEnsureStudentMembership(
        "user-1",
        historicalMembershipInfo,
        null,
      ),
    ).toBe(true);
  });

  test("does not repeat an attempt for the same user", () => {
    expect(
      shouldEnsureStudentMembership(
        "user-1",
        { member: null, memberships: [] },
        "user-1",
      ),
    ).toBe(false);
  });

  test("waits for membership repair before denying access", () => {
    expect(
      shouldRedirectAfterMembershipRepair("pending", "user-1", "user-1"),
    ).toBe(false);
    expect(
      shouldRedirectAfterMembershipRepair("ineligible", "user-1", "user-1"),
    ).toBe(true);
  });

  test("ignores a repair result from a previous user", () => {
    expect(
      shouldRedirectAfterMembershipRepair("ineligible", "user-1", "user-2"),
    ).toBe(false);
  });

  test("does not apply an asynchronous repair result after the user changes", () => {
    expect(isMembershipRepairCurrent("user-1", "user-2")).toBe(false);
    expect(isMembershipRepairCurrent("user-1", "user-1")).toBe(true);
  });
});
