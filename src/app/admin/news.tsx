"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { NewsManagementTable } from "@/components/news/NewsManagementTable";
import { api } from "@/convex/_generated/api";
import {
  isRowFromSelectedEvent,
  useAdminEventFilter,
} from "@/hooks/use-admin-event-filter";

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
  const eventsData = useQuery(api.events.getAll);
  const {
    activeEvent,
    eventId: selectedEventId,
    filter: eventFilter,
  } = useAdminEventFilter(eventsData);
  const isSelectedEvent = (eventId: Parameters<typeof isRowFromSelectedEvent>[0]) =>
    isRowFromSelectedEvent(eventId, selectedEventId, activeEvent);

  return (
    <PageShell>
      <PageHeader
        title="Notícias"
        description="Gerencie comunicados e publicações da simulação em markdown."
      />

      <NewsManagementTable
        newsData={newsData?.filter((newsItem) => isSelectedEvent(newsItem.eventId))}
        membersData={membersData?.filter((member) => isSelectedEvent(member.eventId))}
        committeesData={committeesData?.filter((committee) =>
          isSelectedEvent(committee.eventId),
        )}
        filters={[eventFilter]}
        defaultFilterPreset={
          activeEvent ? { event: activeEvent._id } : undefined
        }
        allowAuthorSelection
        canApprove
        allowApprovalStatusEdit
        isLoading={
          newsData === undefined ||
          membersData === undefined ||
          committeesData === undefined ||
          eventsData === undefined
        }
      />
    </PageShell>
  );
}
