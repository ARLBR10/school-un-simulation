import { createFileRoute } from "@tanstack/react-router";

import { NewsDetailView } from "@/components/news/NewsDetailView";

export const Route = createFileRoute("/news/$id")({
  head: () => ({
    meta: [
      { title: "Notícia — Simulação da ONU" },
      { name: "description", content: "Leia o comunicado completo da simulação." },
    ],
  }),
  component: NewsDetailPage,
});

function NewsDetailPage() {
  const { id } = Route.useParams();

  return <NewsDetailView id={id} />;
}
