import { createFileRoute } from "@tanstack/react-router";

import { AttendanceManagementPanel } from "@/components/attendance/AttendanceManagementPanel";

export const Route = createFileRoute("/attendance")({
  head: () => ({
    meta: [
      { title: "Presenças — Simulação da ONU" },
      {
        name: "description",
        content: "Registre presença e ausência dos membros atribuídos aos seus comitês.",
      },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  return (
    <AttendanceManagementPanel
      title="Presenças"
      description="Registre presença e ausência dos membros atribuídos aos seus comitês."
      restrictedTitle="Acesso exclusivo para operação"
      restrictedDescription="Esta área é reservada para logística, mesários e administradores vinculados aos comitês."
    />
  );
}
