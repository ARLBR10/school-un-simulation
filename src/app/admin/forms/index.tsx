import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formDefinitions } from "@/lib/forms";

export const Route = createFileRoute("/admin/forms/")({
  head: () => ({
    meta: [{ title: "Formulários — Simulação da ONU" }],
  }),
  component: AdminFormsPage,
});

function AdminFormsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Formulários"
        description="Consulte respostas dos formulários publicados pela simulação."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {formDefinitions.map((definition) => (
          <Card key={definition.key}>
            <CardHeader>
              <CardTitle>{definition.title}</CardTitle>
              <CardDescription>{definition.description}</CardDescription>
            </CardHeader>
            <CardFooter className="justify-end">
              <Button
                variant="outline"
                render={
                  <Link
                    to="/admin/forms/$formKey"
                    params={{ formKey: definition.key }}
                  />
                }
              >
                Ver respostas
                <ArrowRight data-icon="inline-end" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
