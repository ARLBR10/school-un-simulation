import { createFileRoute } from "@tanstack/react-router";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Regras — Simulação da ONU" },
      {
        name: "description",
        content: "Regras e orientações oficiais da simulação.",
      },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  return (
    <PageShell className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Regras"
        description="Consulte aqui as regras e orientações oficiais da simulação."
      />

      <Card className="border-dashed bg-card/70">
        <CardHeader>
          <CardTitle>Conteúdo em preparação</CardTitle>
          <CardDescription>
            As regras serão publicadas pela organização assim que estiverem
            disponíveis.
          </CardDescription>
        </CardHeader>
      </Card>
    </PageShell>
  );
}
