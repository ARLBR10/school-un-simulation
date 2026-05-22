import { createFileRoute } from "@tanstack/react-router";

import { AttendanceManagementPanel } from "@/components/attendance/AttendanceManagementPanel";

export const Route = createFileRoute("/admin/attendance")({
  head: () => ({
    meta: [
      { title: "Presenças — Simulação da ONU" },
      {
        name: "description",
        content: "Acompanhe presença e ausência por comitê.",
      },
    ],
  }),
  component: AdminAttendancePage,
});

function AdminAttendancePage() {
  return (
    <AttendanceManagementPanel
      title="Presenças"
      description="Acompanhe presença e ausência de delegados, mesários, logística e imprensa por comitê."
      restrictedTitle="Acesso administrativo necessário"
      restrictedDescription="Esta página é reservada para administradores e equipes autorizadas a registrar presença."
      showAdminLinks
      allowDateSelection
    />
  );
}
