"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { Spinner } from "@/components/ui/spinner";

const ClientRoot = dynamic(
  () => import("@/components/layout/ClientRoot").then((mod) => mod.ClientRoot),
  {
    ssr: false,
    loading: () => (
      <div
        aria-live="polite"
        aria-busy="true"
        className="grid min-h-screen place-items-center bg-background"
      >
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    ),
  },
);

export function ClientRootLoader({ children }: { children: ReactNode }) {
  return <ClientRoot>{children}</ClientRoot>;
}
