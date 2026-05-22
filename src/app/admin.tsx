"use client";
import { Outlet, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useEffect } from "react";

import { AdminPageTransition } from "@/components/admin/AdminPageTransition";
import { api } from "@/convex/_generated/api";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Simulação da ONU" },
      {
        name: "description",
        content: "Área administrativa da simulação.",
      },
    ],
  }),
  component: AdminLayout,
});

function AdminLayout() {
  const userInfo = useQuery(api.auth.getCurrentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (
      userInfo !== undefined &&
      (userInfo === null || userInfo.member?.type !== "admin")
    ) {
      void navigate({ to: "/", replace: true });
    }
  }, [navigate, userInfo]);

  if (userInfo === undefined) {
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
