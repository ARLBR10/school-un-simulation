"use client";
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { AdminPageTransition } from "@/components/admin/AdminPageTransition";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const userInfo = useQuery(api.auth.getCurrentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (userInfo && userInfo.member?.type !== "admin") {
      void navigate({ to: "/", replace: true });
    }
  }, [navigate, userInfo]);

  if (userInfo === undefined || userInfo?.member?.type !== "admin") {
    return null;
  }

  return (
    <div className="min-w-0 flex-1">
      <AdminPageTransition>
        <Outlet />
      </AdminPageTransition>
    </div>
  );
}
