import { PageHeader, PageShell } from "@/components/layout/PageShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AdminPage() {
  return (
    <PageShell>
      <PageHeader
        title="Painel Administrativo"
        description="Acompanhe e gerencie os dados centrais da simulação."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Membros</CardTitle>
            <CardDescription>Cadastros e vínculos de participantes.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Use o menu lateral para criar, editar e revisar membros.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Comitês</CardTitle>
            <CardDescription>Temas, tópicos e delegações.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Organize as mesas e acompanhe as representações cadastradas.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
            <CardDescription>Acessos da plataforma.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Gerencie contas e informações de autenticação dos usuários.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
            <CardDescription>Pontuações e deduções.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Registre lançamentos para acompanhar o desempenho dos membros.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Presenças</CardTitle>
            <CardDescription>Presença diária por comitê.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Marque presentes e ausentes entre delegados, mesários, logística e imprensa.
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}
