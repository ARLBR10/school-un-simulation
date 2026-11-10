"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { DynamicTable, type AdminTableColumn } from "@/components/admin/DynamicTable";
import { createSelectColumn } from "@/components/admin/DynamicTableFields";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";

export const Route = createFileRoute("/admin/events")({
  head: () => ({ meta: [{ title: "Eventos — Simulação da ONU" }] }),
  component: EventsPage,
});

const statusLabels: Record<Doc<"events">["status"], string> = {
  planned: "Planejado",
  active: "Ativo",
  past: "Evento passado",
};

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({
  value,
  label,
}));

const kindLabels: Record<NonNullable<Doc<"events">["kind"]>, string> = {
  un_simulation: "Simulação da ONU",
  operations_theater: "Teatro de operações",
};

const kindOptions = Object.entries(kindLabels).map(([value, label]) => ({
  value,
  label,
}));

function EventsPage() {
  const events = useQuery(api.events.getAll);
  const createEvent = useMutation(api.events.create);
  const updateEvent = useMutation(api.events.update);

  const columns: AdminTableColumn<Doc<"events">>[] = [
    { key: "name", label: "Nome" },
    { key: "slug", label: "Identificador" },
    { key: "year", label: "Ano" },
    {
      ...createSelectColumn({
        key: "status",
        label: "Estado",
        options: statusOptions,
        placeholder: "Selecione o estado",
      }),
      render: (event) => (
        <Badge variant={event.status === "active" ? "default" : "secondary"}>
          {statusLabels[event.status]}
        </Badge>
      ),
    },
    {
      ...createSelectColumn({
        key: "kind",
        label: "Tipo",
        options: kindOptions,
        placeholder: "Selecione o tipo",
      }),
      showInEditForm: false,
      render: (event) => kindLabels[event.kind ?? "un_simulation"],
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Eventos"
        description="Defina as edições da simulação e qual delas está ativa. Administradores continuam globais."
      />
      <DynamicTable
        columns={columns}
        data={events ?? []}
        filters={[
          {
            id: "status",
            key: "status",
            label: "Estado",
            options: statusOptions,
          },
        ]}
        isLoading={events === undefined}
        rowKey="slug"
        onCreate={async (values) => {
          if (!values.kind) {
            toast.error("Selecione o tipo do evento.");
            return false;
          }
          try {
            const id = await createEvent({
              name: values.name?.trim() ?? "",
              slug: values.slug?.trim() ?? "",
              year: Number(values.year),
              status: values.status as Doc<"events">["status"],
              kind: values.kind as NonNullable<Doc<"events">["kind"]>,
            });
            if (!id) return false;
            toast.success("Evento criado com sucesso.");
            return true;
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Não foi possível criar o evento.");
            return false;
          }
        }}
        onUpdate={async (event, values) => {
          try {
            const updated = await updateEvent({
              id: event._id,
              name: values.name?.trim(),
              slug: values.slug?.trim(),
              year: values.year ? Number(values.year) : undefined,
              status: values.status as Doc<"events">["status"] | undefined,
            });
            if (updated !== true) return false;
            toast.success("Evento atualizado com sucesso.");
            return true;
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Não foi possível atualizar o evento.");
            return false;
          }
        }}
      />
    </PageShell>
  );
}
