import type { Metadata } from "next";

import { CommitteeDetailView } from "@/components/committees/CommitteeDetailView";

export const metadata: Metadata = {
  title: "Comitê — Simulação da ONU",
  description: "Composição, mesa diretora, tópicos e delegações do comitê.",
};

export default async function CommitteeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CommitteeDetailView id={id} />;
}
