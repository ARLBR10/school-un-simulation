import { createFileRoute } from "@tanstack/react-router";

import { ConvexForm } from "@/components/forms/ConvexForm";
import { PageShell } from "@/components/layout/PageShell";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getFormDefinition } from "@/lib/forms";

export const Route = createFileRoute("/forms/$formKey")({
  head: () => ({
    meta: [
      { title: "Formulário — Simulação da ONU" },
      {
        name: "description",
        content: "Formulário oficial da Simulação da ONU.",
      },
    ],
  }),
  component: FormPage,
});

function FormPage() {
  const { formKey } = Route.useParams();
  const definition = getFormDefinition(formKey);

  return (
    <PageShell className="mx-auto w-full max-w-3xl">
      {definition ? (
        <ConvexForm definition={definition} />
      ) : (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Formulário não encontrado</CardTitle>
            <CardDescription>
              Este formulário não existe ou não está mais disponível.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </PageShell>
  );
}
