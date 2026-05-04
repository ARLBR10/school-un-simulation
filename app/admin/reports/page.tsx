import { PageHeader, PageShell } from "@/components/layout/PageShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Relatórios"
        description="Resumo e acompanhamento dos dados administrativos."
      />

      <Card>
        <CardHeader>
          <CardTitle>Relatórios indisponíveis</CardTitle>
          <CardDescription>
            Esta seção está pronta para receber indicadores e exportações.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Os relatórios serão exibidos aqui quando houver métricas configuradas.
        </CardContent>
      </Card>
    </PageShell>
  );
}
