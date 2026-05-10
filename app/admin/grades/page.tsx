import { GradingManagementPanel } from "@/components/grading/GradingManagementPanel";

export default function AdminGradesPage() {
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
