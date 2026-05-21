import type { ReactNode } from "react";

import { ClientRoot } from "@/components/layout/ClientRoot";

export function ClientRootLoader({ children }: { children: ReactNode }) {
  return <ClientRoot>{children}</ClientRoot>;
}
