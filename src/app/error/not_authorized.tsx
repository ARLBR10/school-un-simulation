import { createFileRoute } from "@tanstack/react-router";

import { NotAuthorizedContent } from "./-NotAuthorizedContent";

export const Route = createFileRoute("/error/not_authorized")({
  head: () => ({
    meta: [
      { title: "Acesso não autorizado | Simulação da ONU" },
      {
        name: "description",
        content: "Orientações para usuários que ainda não possuem autorização de acesso.",
      },
    ],
  }),
  component: NotAuthorizedPage,
});

function NotAuthorizedPage() {
  return <NotAuthorizedContent />;
}
