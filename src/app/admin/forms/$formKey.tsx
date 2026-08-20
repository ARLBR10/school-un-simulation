import { createFileRoute } from "@tanstack/react-router";

import { FormResponsesView } from "@/components/forms/FormResponsesView";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFormDefinition } from "@/lib/forms";

export const Route = createFileRoute("/admin/forms/$formKey")({
  head: () => ({
    meta: [
      { title: "Respostas de formulários — Simulação da ONU" },
      {
        name: "description",
        content: "Consulte as respostas enviadas aos formulários da simulação.",
      },
    ],
  }),
  component: AdminFormResponsesPage,
});

function AdminFormResponsesPage() {
  const { formKey } = Route.useParams();
  const definition = getFormDefinition(formKey);

  if (definition) return <FormResponsesView definition={definition} />;

  return (
    <PageShell>
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Formulário não encontrado</CardTitle>
          <CardDescription>
            Não existe uma definição de formulário com este identificador.
          </CardDescription>
        </CardHeader>
      </Card>
    </PageShell>
  );
}
