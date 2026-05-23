"use client";

import { useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { api } from "@/convex/_generated/api";
import { Spinner } from "@/components/ui/spinner";

export default function MembershipRequired({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const userInfo = useQuery(api.auth.getCurrentUser);
  const [hasLoadedUserInfo, setHasLoadedUserInfo] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isLoginPublicPath =
    pathname.startsWith("/auth") ||
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
    if (userInfo && !userInfo.member && !isMembershipPublicPath) {
      void navigate({ to: "/error/not_authorized", replace: true });
    }
  }, [navigate, userInfo, isMembershipPublicPath]);

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
