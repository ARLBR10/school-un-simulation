import { createRouter } from "@tanstack/react-router";

import { PageShell } from "@/components/layout/PageShell";
import { Spinner } from "@/components/ui/spinner";

import { routeTree } from "./routeTree.gen";

function DefaultPendingComponent() {
  return (
    <PageShell
      aria-live="polite"
      aria-busy="true"
      className="min-h-[calc(100vh-var(--header-height,3rem))] items-center justify-center"
    >
      <Spinner className="size-6 text-muted-foreground" />
      <span className="sr-only">Carregando página</span>
    </PageShell>
  );
}

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: "intent",
    defaultPendingComponent: DefaultPendingComponent,
    defaultPendingMs: 0,
    defaultPendingMinMs: 150,
    scrollRestoration: true,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
