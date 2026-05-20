"use client";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminPageTransition } from "@/components/admin/AdminPageTransition";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userInfo = useQuery(api.auth.getCurrentUser);

  if (userInfo?.member?.type !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-w-0 flex-1">
      <AdminPageTransition>{children}</AdminPageTransition>
    </div>
  );
}
