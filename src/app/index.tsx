import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/layout/PageShell";
import { Welcome } from "@/components/home/Welcome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Simulação da ONU" },
      {
        name: "description",
        content: "Painel para participantes da simulação das Nações Unidas.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <PageShell>
      <Welcome />
    </PageShell>
  );
}
