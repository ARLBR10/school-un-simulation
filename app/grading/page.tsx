import { GradingManagementPanel } from "@/components/grading/GradingManagementPanel";

export default function GradingPage() {
  return (
    <GradingManagementPanel
      title="Lançamentos de notas"
      description="Registre pontuações e deduções dos delegados dentro do seu escopo de atuação."
      restrictedTitle="Acesso exclusivo para lançamento de notas"
      restrictedDescription="Esta área é reservada para mesários, logística e administradores autorizados a lançar pontuações ou deduções."
    />
  );
}
