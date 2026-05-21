"use client";

import type { ReactNode } from "react";

import AllProviders from "@/components/Providers";
import { AppShell } from "@/components/layout/AppShell";
import MembershipRequired from "@/components/layout/MembershipRequired";
import { Toaster } from "@/components/ui/sonner";

export function ClientRoot({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  return (
    <AllProviders initialToken={initialToken}>
      <div className="flex flex-col min-h-screen relative overflow-x-hidden">
        <div className="absolute inset-0 z-[-1] pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,90,0.15),transparent_60%),radial-gradient(circle_at_100%_100%,rgba(20,20,40,0.4),transparent_50%)]" />
        <MembershipRequired>
          <AppShell>{children}</AppShell>
        </MembershipRequired>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </AllProviders>
  );
}
