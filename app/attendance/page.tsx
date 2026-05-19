import { AttendanceManagementPanel } from "@/components/attendance/AttendanceManagementPanel";

export default function AttendancePage() {
  return (
    <AttendanceManagementPanel
      title="Presenças"
      description="Registre presença e ausência dos membros atribuídos aos seus comitês."
      restrictedTitle="Acesso exclusivo para operação"
      restrictedDescription="Esta área é reservada para logística, mesários e administradores vinculados aos comitês."
    />
  );
}
