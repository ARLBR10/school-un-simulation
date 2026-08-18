"use client";

import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Newspaper } from "lucide-react";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { NewsManagementTable } from "@/components/news/NewsManagementTable";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

export const Route = createFileRoute("/press/news")({
  head: () => ({
    meta: [
      { title: "Notícias da imprensa — Simulação da ONU" },
      {
        name: "description",
        content: "Crie, revise e publique notícias da equipe de imprensa.",
      },
    ],
  }),
  component: PressNewsPage,
});

function PressNewsPage() {
  const userInfo = useQuery(api.auth.getCurrentUser);
  const newsData = useQuery(api.news.getManageList);
  const committeesData = useQuery(api.committees.listForManagement);
  const isUserLoading = userInfo === undefined;
  const member = userInfo?.member ?? null;

  if (isUserLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Notícias da imprensa"
          description="Carregando o painel de publicação da equipe de imprensa."
        />
        <Card>
          <CardContent className="flex flex-col gap-3">
            <Skeleton className="h-9 w-full max-w-sm" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  if (!member || (member.type !== "press" && member.type !== "admin")) {
    return (
      <PageShell className="mx-auto w-full max-w-3xl">
        <Card className="border-dashed bg-card/70">
          <CardHeader>
            <CardTitle>Acesso exclusivo da imprensa</CardTitle>
          <CardDescription>
            Esta área é reservada para membros da equipe de imprensa criarem,
              revisarem e publicarem notícias da simulação.
          </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link to="/news" />} variant="outline">
              Ver notícias públicas
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Notícias da imprensa"
        description={
          "Escreva notícias e acompanhe a aprovação antes da publicação."
        }
        action={
          <Button render={<Link to="/news" />} variant="outline" size="sm">
            <Newspaper data-icon="inline-start" />
            Ver página pública
          </Button>
        }
      />

      <NewsManagementTable
        newsData={newsData}
        committeesData={committeesData}
        currentAuthorId={member._id}
        isLoading={newsData === undefined || committeesData === undefined}
      />
    </PageShell>
  );
}
