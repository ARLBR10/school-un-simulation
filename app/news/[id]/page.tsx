import type { Metadata } from "next";

import { NewsDetailView } from "@/components/news/NewsDetailView";

export const metadata: Metadata = {
  title: "Notícia — Simulação da ONU",
  description: "Leia o comunicado completo da simulação.",
};

export default async function NewsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <NewsDetailView id={id} />;
}
