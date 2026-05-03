import type { Metadata } from "next";

import { CommitteesView } from "@/components/committees/CommitteesView";

export const metadata: Metadata = {
  title: "Comitês — Simulação da ONU",
  description:
    "Painel oficial dos comitês em sessão: temas, mesários e delegações.",
};

export default function CommitteesPage() {
  return <CommitteesView />;
}
