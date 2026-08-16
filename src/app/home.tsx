import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ClipboardCheck, FileText, Globe2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    title: "Organização do evento",
    description: "Centraliza comitês, membros, documentos, notícias e informações operacionais da simulação.",
    icon: Globe2,
  },
  {
    title: "Áreas com permissão",
    description: "Separa acessos de delegados, imprensa, avaliadores, operação e administração.",
    icon: ShieldCheck,
  },
  {
    title: "Acompanhamento interno",
    description: "Ajuda a registrar presenças, notas e entregas sem expor dados fora do necessário.",
    icon: ClipboardCheck,
  },
  {
    title: "Conteúdo público",
    description: "Mantém páginas informativas para regras, notícias, comitês, termos e privacidade.",
    icon: FileText,
  },
];

export const Route = createFileRoute("/home")({
  head: () => ({
    meta: [
      { title: "Sobre a plataforma — Simulação da ONU" },
      {
        name: "description",
        content: "Descrição pública da plataforma usada para organizar uma simulação escolar da ONU.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="relative isolate overflow-hidden border-b border-border/70">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(99,102,241,0.22),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(14,165,233,0.15),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.06),transparent_45%)]" />
        <div className="mx-auto flex min-h-[68vh] w-full max-w-6xl flex-col justify-center gap-8 px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex max-w-3xl flex-col gap-5">
            <p className="w-fit rounded-full border border-border bg-card/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
              Plataforma educacional
            </p>
            <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-6xl">
              Painel para organizar uma simulação escolar da ONU.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              A Simulação da ONU usa esta plataforma para apoiar a organização do evento, reunir informações importantes e dar acesso seguro às áreas necessárias para participantes e equipe.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              render={
                <Link
                  to="/auth/$path"
                  params={{ path: "sign-in" }}
                  search={{ redirectTo: "/home" }}
                />
              }
              size="lg"
              className="w-full sm:w-auto"
            >
              Entrar na plataforma
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              render={<Link to="/privacy" />}
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              Ver privacidade
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-2 lg:px-8">
        {features.map((feature) => {
          const Icon = feature.icon;

          return (
            <Card key={feature.title} className="bg-card/70">
              <CardContent className="flex gap-4 p-5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="font-semibold tracking-tight">{feature.title}</h2>
                  <p className="text-sm leading-6 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-border bg-card/70 p-6 sm:p-8">
          <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] md:items-end">
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">
                Finalidade limitada ao evento escolar
              </h2>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                O produto existe para facilitar a administração da simulação. Dados e registros devem ser usados apenas para autenticação, autorização, comunicação, acompanhamento de participação e operação do evento.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground md:text-right">
              <Link to="/terms" className="font-medium text-foreground underline-offset-4 hover:underline">
                Termos de Serviço
              </Link>
              <Link to="/privacy" className="font-medium text-foreground underline-offset-4 hover:underline">
                Política de Privacidade
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
