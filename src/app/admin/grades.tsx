import { createFileRoute } from "@tanstack/react-router";

import { GradingManagementPanel } from "@/components/grading/GradingManagementPanel";

export const Route = createFileRoute("/admin/grades")({
  component: AdminGradesPage,
});

function AdminGradesPage() {
  return (
    <GradingManagementPanel
      title="Notas"
      description="Registre pontuações e deduções dos membros da simulação."
      restrictedTitle="Acesso administrativo necessário"
      restrictedDescription="Esta página é reservada para administradores e funções autorizadas a lançar notas."
      showAdminLinks
    />
  );
}
