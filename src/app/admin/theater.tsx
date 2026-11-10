"use client";

import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Map as MapIcon, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DynamicTable, type AdminTableColumn } from "@/components/admin/DynamicTable";
import { createSelectColumn } from "@/components/admin/DynamicTableFields";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
import {
  TheaterFactionBadge,
  TheaterOptionSelect,
} from "@/components/theater/TheaterShared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import {
  theaterFactionColorLabels,
  type TheaterFactionColor,
} from "@/lib/theater";

export const Route = createFileRoute("/admin/theater")({
  head: () => ({
    meta: [
      { title: "Teatro de Operações — Simulação da ONU" },
      {
        name: "description",
        content: "Gerencie facções e funções dos participantes do teatro de operações.",
      },
    ],
  }),
  component: AdminTheaterPage,
});

type ParticipantType = "glucon" | "delegate" | "observer" | "unassigned";

const participantTypeLabels: Record<ParticipantType, string> = {
  glucon: "GLUCON",
  delegate: "Delegação",
  observer: "Observador",
  unassigned: "Função não definida",
};

const participantTypeOptions = Object.entries(participantTypeLabels).map(
  ([value, label]) => ({ value, label }),
);

const colorOptions = Object.entries(theaterFactionColorLabels).map(([value, label]) => ({
  value,
  label,
}));

const noFactionValue = "__no_faction__";

function isParticipantType(type: string): type is ParticipantType {
  return type in participantTypeLabels;
}

function AdminTheaterPage() {
  const events = useQuery(api.events.getAll);
  const theaterEvents = (events ?? []).filter(
    (event) => event.kind === "operations_theater",
  );
  const [selectedEventId, setSelectedEventId] = useState<Id<"events"> | "">("");
  const eventId =
    selectedEventId ||
    (theaterEvents.find((event) => event.status === "active") ?? theaterEvents[0])?._id;

  const factions = useQuery(api.theater.listFactions, eventId ? { eventId } : "skip");
  const participants = useQuery(
    api.theater.listParticipants,
    eventId ? { eventId } : "skip",
  );
  const createFaction = useMutation(api.theater.createFaction);
  const updateFaction = useMutation(api.theater.updateFaction);
  const removeFaction = useMutation(api.theater.removeFaction);
  const updateParticipant = useMutation(api.theater.updateParticipant);

  const factionsById = new Map((factions ?? []).map((faction) => [faction._id, faction]));
  const factionOptions = [
    { value: noFactionValue, label: "Sem facção" },
    ...(factions ?? []).map((faction) => ({ value: faction._id, label: faction.name })),
  ];

  const factionColumns: AdminTableColumn<Doc<"theaterFactions">>[] = [
    { key: "name", label: "Nome" },
    {
      ...createSelectColumn({
        key: "color",
        label: "Cor",
        options: colorOptions,
        placeholder: "Selecione a cor",
      }),
      render: (faction) => <TheaterFactionBadge faction={faction} />,
    },
  ];

  const participantColumns: AdminTableColumn<Doc<"members">>[] = [
    { key: "name", label: "Nome", showInEditForm: false },
    {
      ...createSelectColumn({
        key: "type",
        label: "Função",
        options: participantTypeOptions,
        placeholder: "Selecione a função",
      }),
      render: (member) =>
        isParticipantType(member.type) ? (
          <Badge variant={member.type === "unassigned" ? "outline" : "secondary"}>
            {participantTypeLabels[member.type]}
          </Badge>
        ) : (
          <Badge variant="outline">Outra função</Badge>
        ),
    },
    {
      ...createSelectColumn({
        key: "theaterFactionId",
        label: "Facção",
        options: factionOptions,
        placeholder: "Selecione a facção",
      }),
      render: (member) =>
        member.theaterFactionId ? (
          <TheaterFactionBadge faction={factionsById.get(member.theaterFactionId)} />
        ) : (
          "-"
        ),
    },
    { key: "theaterPosition", label: "Cargo" },
    {
      key: "userId",
      label: "Conta",
      showInForm: false,
      render: (member) =>
        member.userId ? (
          <Badge variant="secondary">Vinculada</Badge>
        ) : (
          <Badge variant="outline">Sem conta</Badge>
        ),
    },
  ];

  const eventSelect =
    theaterEvents.length > 0 && eventId ? (
      <div className="w-full sm:w-72">
        <TheaterOptionSelect
          ariaLabel="Teatro de operações"
          value={eventId}
          options={theaterEvents.map((event) => ({
            value: event._id,
            label: event.status === "past" ? `${event.name} (evento passado)` : event.name,
          }))}
          onChange={(value) => setSelectedEventId(value as Id<"events">)}
        />
      </div>
    ) : null;

  return (
    <PageShell>
      <PageHeader
        title="Teatro de Operações"
        description="Defina as facções e a função de cada participante no teatro de operações."
        action={eventSelect}
      />

      {events !== undefined && theaterEvents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col gap-3 p-6">
            <div>
              <h2 className="text-lg font-semibold">Nenhum teatro de operações</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie um evento do tipo &quot;Teatro de operações&quot; para começar.
              </p>
            </div>
            <Button
              nativeButton={false}
              render={<Link to="/admin/events" />}
              variant="outline"
              className="self-start"
            >
              Ir para eventos
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {eventId ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Facções</CardTitle>
              <CardDescription>
                Lados do conflito. Cada delegação pertence a uma facção e só vê os
                marcadores e ordens liberados para ela.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DynamicTable
                columns={factionColumns}
                data={factions ?? []}
                isLoading={factions === undefined}
                rowKey="_id"
                showColumnVisibility={false}
                onCreate={async (values) => {
                  if (!values.name?.trim() || !values.color) {
                    toast.error("Informe nome e cor da facção.");
                    return false;
                  }
                  try {
                    await createFaction({
                      eventId,
                      name: values.name,
                      color: values.color as TheaterFactionColor,
                    });
                    toast.success("Facção criada.");
                    return true;
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Não foi possível criar a facção.",
                    );
                    return false;
                  }
                }}
                onUpdate={async (faction, values) => {
                  try {
                    await updateFaction({
                      factionId: faction._id,
                      name: values.name,
                      color: (values.color || undefined) as TheaterFactionColor | undefined,
                    });
                    toast.success("Facção atualizada.");
                    return true;
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Não foi possível atualizar a facção.",
                    );
                    return false;
                  }
                }}
                onDelete={async (faction) => {
                  try {
                    await removeFaction({ factionId: faction._id });
                    toast.success("Facção excluída.");
                    return true;
                  } catch (error) {
                    toast.error(
                      error instanceof Error ? error.message : "Não foi possível excluir a facção.",
                    );
                    return false;
                  }
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Participantes</CardTitle>
              <CardDescription>
                GLUCON opera o mapa e lê todas as ordens; delegações veem o que sua
                facção pode ver e enviam ordens; observadores só veem o que é público.
                Cadastre novas pessoas no evento em Membros.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  nativeButton={false}
                  render={<Link to="/admin/members" />}
                  variant="outline"
                  size="sm"
                >
                  <Users data-icon="inline-start" />
                  Cadastrar membros
                </Button>
                <Button
                  nativeButton={false}
                  render={<Link to="/theater" search={{ event: eventId }} />}
                  variant="outline"
                  size="sm"
                >
                  <MapIcon data-icon="inline-start" />
                  Abrir mapa
                </Button>
              </div>
              <DynamicTable
                columns={participantColumns}
                data={participants ?? []}
                isLoading={participants === undefined}
                rowKey="_id"
                onUpdate={async (member, values) => {
                  const type = values.type ?? "";
                  if (!isParticipantType(type)) {
                    toast.error("Selecione a função do participante.");
                    return false;
                  }
                  const factionValue = values.theaterFactionId ?? "";
                  try {
                    await updateParticipant({
                      memberId: member._id,
                      type,
                      theaterFactionId:
                        factionValue && factionValue !== noFactionValue
                          ? (factionValue as Id<"theaterFactions">)
                          : null,
                      theaterPosition: values.theaterPosition || null,
                    });
                    toast.success("Participante atualizado.");
                    return true;
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : "Não foi possível atualizar o participante.",
                    );
                    return false;
                  }
                }}
              />
            </CardContent>
          </Card>
        </>
      ) : null}
    </PageShell>
  );
}
