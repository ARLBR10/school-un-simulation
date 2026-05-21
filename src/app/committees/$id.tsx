import { createFileRoute } from "@tanstack/react-router";

import { CommitteeDetailView } from "@/components/committees/CommitteeDetailView";

export const Route = createFileRoute("/committees/$id")({
  head: () => ({
    meta: [
      { title: "Comitê — Simulação da ONU" },
      {
        name: "description",
        content: "Composição, mesa diretora, tópicos e delegações do comitê.",
      },
    ],
  }),
  component: CommitteeDetailPage,
});

function CommitteeDetailPage() {
  const { id } = Route.useParams();

  return <CommitteeDetailView id={id} />;
}
