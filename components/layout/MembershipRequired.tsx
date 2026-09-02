"use client";

import { useLocation, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { api } from "@/convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";
import { capturePostHogSafely } from "@/lib/posthog-telemetry";
import {
  isMembershipRepairCurrent,
  shouldEnsureStudentMembership,
  shouldRedirectAfterMembershipRepair,
  type MembershipRepairStatus,
} from "@/lib/student-membership";

export default function MembershipRequired({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const userInfo = useQuery(api.auth.getCurrentUser);
  const ensureMembership = useMutation(api.auth.ensureStudentMembership);
  const [hasLoadedUserInfo, setHasLoadedUserInfo] = useState(false);
  const [repairStatus, setRepairStatus] =
    useState<MembershipRepairStatus>("idle");
  const [repairUserId, setRepairUserId] = useState<string | null>(null);
  const attemptedUserId = useRef<string | null>(null);
  const currentUserId = useRef<string | undefined>(userInfo?._id);
  currentUserId.current = userInfo?._id;
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isLoginPublicPath =
    pathname.startsWith("/auth") ||
    pathname === "/home" ||
    pathname === "/invites" ||
    pathname === "/terms" ||
    pathname === "/privacy";
  const isMembershipPublicPath =
    isLoginPublicPath || pathname.startsWith("/error") || pathname === "/invites";

  useEffect(() => {
    if (userInfo !== undefined) {
      setHasLoadedUserInfo(true);
    }
  }, [userInfo]);

  useEffect(() => {
    const userId = userInfo?._id;

    if (userInfo?.member) {
      setRepairUserId(userId ?? null);
      setRepairStatus("ready");
      return;
    }

    if (
      !shouldEnsureStudentMembership(
        userId,
        userInfo,
        attemptedUserId.current,
      )
    ) {
      return;
    }

    attemptedUserId.current = userId ?? null;
    setRepairUserId(userId ?? null);
    setRepairStatus("pending");
    void ensureMembership()
      .then((outcome) => {
        if (!userId || !isMembershipRepairCurrent(userId, currentUserId.current)) {
          return;
        }
        setRepairStatus(outcome);
      })
      .catch((error: unknown) => {
        if (!userId || !isMembershipRepairCurrent(userId, currentUserId.current)) {
          return;
        }
        console.error("Failed to ensure student membership", error);
        capturePostHogSafely(() => {
          posthog.captureException(error, {
            module: "student_membership",
            operation: "ensure_from_access_guard",
          });
        });
        setRepairStatus("error");
      });
  }, [ensureMembership, userInfo]);

  useEffect(() => {
    if (userInfo === null && !isLoginPublicPath) {
      void navigate({
        to: "/auth/$path",
        params: { path: "sign-in" },
        search: { redirectTo: pathname },
        replace: true,
      });
    }
  }, [navigate, pathname, userInfo, isLoginPublicPath]);

  useEffect(() => {
    if (
      userInfo &&
      !userInfo.member &&
      !isMembershipPublicPath &&
      shouldRedirectAfterMembershipRepair(
        repairStatus,
        repairUserId,
        userInfo._id,
      )
    ) {
      void navigate({ to: "/error/not_authorized", replace: true });
    }
  }, [
    navigate,
    userInfo,
    isMembershipPublicPath,
    repairStatus,
    repairUserId,
  ]);

  if (
    isLoginPublicPath ||
    (pathname.startsWith("/error") && userInfo) ||
    userInfo?.member
  ) {
    return <>{children}</>;
  }

  if (userInfo === null || (userInfo && !userInfo.member)) {
    return null;
  }

  if (hasLoadedUserInfo) {
    return <>{children}</>;
  }

  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className="grid min-h-screen place-items-center bg-background"
    >
      <Spinner className="size-6 text-muted-foreground" />
    </div>
  );
}
