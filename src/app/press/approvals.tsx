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

export const Route = createFileRoute("/press/approvals")({
  head: () => ({
    meta: [
      { title: "Aprovações da imprensa — Simulação da ONU" },
      {
        name: "description",
        content: "Revise, aprove ou negue notícias enviadas pela imprensa.",
      },
    ],
  }),
  component: PressApprovalsPage,
});

function PressApprovalsPage() {
  const userInfo = useQuery(api.auth.getCurrentUser);
  const newsData = useQuery(api.news.getManageList);
  const committeesData = useQuery(api.committees.listForManagement);
  const isUserLoading = userInfo === undefined;
  const member = userInfo?.member ?? null;
  const canApprove = member?.type === "admin" || member?.pressRole === "media";
  const pendingNews = newsData?.filter(
    (newsItem) => newsItem.approvalStatus === "pending",
  );

  if (isUserLoading) {
    return (
      <PageShell>
        <PageHeader
          title="Aprovações da imprensa"
          description="Carregando notícias aguardando revisão."
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

  if (!canApprove) {
    return (
      <PageShell className="mx-auto w-full max-w-3xl">
        <Card className="border-dashed bg-card/70">
          <CardHeader>
            <CardTitle>Acesso exclusivo dos aprovadores</CardTitle>
            <CardDescription>
              Esta área é reservada para mídia da imprensa e administradores
              revisarem notícias antes da publicação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button render={<Link to="/press/news" />} variant="outline">
              Voltar para notícias da imprensa
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <PageHeader
        title="Aprovações da imprensa"
        description="Revise, aprove ou negue notícias enviadas por redatores."
        action={
          <Button
            render={<Link to="/press/news" />}
            variant="outline"
            size="sm"
          >
            <Newspaper data-icon="inline-start" />
            Ver notícias da imprensa
          </Button>
        }
      />

      <NewsManagementTable
        newsData={pendingNews}
        committeesData={committeesData}
        allowCreate={false}
        canApprove
        isLoading={newsData === undefined || committeesData === undefined}
      />
    </PageShell>
  );
}
