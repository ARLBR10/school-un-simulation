import { createFileRoute } from "@tanstack/react-router";

import { NewsView } from "@/components/news/NewsView";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "Notícias — Simulação da ONU" },
      {
        name: "description",
        content: "Acompanhe as últimas notícias e comunicados oficiais da simulação.",
      },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  return <NewsView />;
}
