import { AttendanceManagementPanel } from "@/components/attendance/AttendanceManagementPanel";

export default function AdminAttendancePage() {
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
