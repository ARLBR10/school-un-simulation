"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";

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
  const isPublicPath =
    pathname.startsWith("/auth") ||
    pathname.startsWith("/error") ||
    pathname === "/terms" ||
    pathname === "/privacy";

  useEffect(() => {
    if (userInfo !== undefined) {
      setHasLoadedUserInfo(true);
    }
  }, [userInfo]);

  useEffect(() => {
    if (userInfo && !userInfo.member && !isPublicPath) {
      void navigate({ to: "/error/not_authorized", replace: true });
    }
  }, [navigate, userInfo, isPublicPath]);

  if (isPublicPath || userInfo === null || userInfo?.member) {
    return <>{children}</>;
  }

  if (userInfo && !userInfo.member) {
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
