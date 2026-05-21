import { createFileRoute } from "@tanstack/react-router";

import { CommitteesView } from "@/components/committees/CommitteesView";

export const Route = createFileRoute("/committees/")({
  head: () => ({
    meta: [
      { title: "Comitês — Simulação da ONU" },
      {
        name: "description",
        content: "Painel oficial dos comitês em sessão: temas, mesários e delegações.",
      },
    ],
  }),
  component: CommitteesPage,
});

function CommitteesPage() {
  return <CommitteesView />;
}
