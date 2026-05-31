import { createFileRoute } from "@tanstack/react-router";

import { GradingManagementPanel } from "@/components/grading/GradingManagementPanel";

export const Route = createFileRoute("/admin/grades")({
  head: () => ({
    meta: [
      { title: "Notas — Simulação da ONU" },
      {
        name: "description",
        content: "Registre pontuações e deduções dos membros da simulação.",
      },
    ],
  }),
  component: AdminGradesPage,
});

function AdminGradesPage() {
  return (
    <GradingManagementPanel
      title="Notas"
      description="Registre pontuações e deduções dos membros da simulação."
      restrictedTitle="Acesso administrativo necessário"
      restrictedDescription="Esta página é reservada para administradores e funções autorizadas a lançar notas."
      enableNonDelegateTab
      showAdminLinks
    />
  );
}
