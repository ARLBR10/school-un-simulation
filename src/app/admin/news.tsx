"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { NewsManagementTable } from "@/components/news/NewsManagementTable";
import { api } from "@/convex/_generated/api";

export const Route = createFileRoute("/admin/news")({
  head: () => ({
    meta: [
      { title: "Notícias — Simulação da ONU" },
      {
        name: "description",
        content: "Gerencie comunicados e publicações da simulação.",
      },
    ],
  }),
  component: AdminNewsPage,
});

function AdminNewsPage() {
  const newsData = useQuery(api.news.getAll);
  const membersData = useQuery(api.members.getAll);
  const committeesData = useQuery(api.committees.getAll);

  return (
    <PageShell>
      <PageHeader
        title="Notícias"
        description="Gerencie comunicados e publicações da simulação em markdown."
      />

      <NewsManagementTable
        newsData={newsData}
        membersData={membersData}
        committeesData={committeesData}
        allowAuthorSelection
        isLoading={
          newsData === undefined ||
          membersData === undefined ||
          committeesData === undefined
        }
      />
    </PageShell>
  );
}
