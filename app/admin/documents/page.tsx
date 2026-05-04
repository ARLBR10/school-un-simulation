import { PageHeader, PageShell } from "@/components/layout/PageShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function DocumentsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Documentos"
        description="Área reservada para arquivos e materiais oficiais da simulação."
      />

      <Card>
        <CardHeader>
          <CardTitle>Nenhum documento publicado</CardTitle>
          <CardDescription>
            Quando houver materiais disponíveis, eles aparecerão nesta página.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Use esta seção para centralizar guias, resoluções e comunicados.
        </CardContent>
      </Card>
    </PageShell>
  );
}
