"use client";

import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { CircleQuestionMark, MapPinPlus, Move, ScrollText, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { TheaterMap } from "@/components/theater/TheaterMap";
import {
  TheaterMarkerSheet,
  type TheaterMarkerDraft,
} from "@/components/theater/TheaterMarkerSheet";
import { getTheaterMarkerIcon } from "@/components/theater/theater-marker-icons";
import {
  TheaterFactionBadge,
  TheaterLoadingState,
  TheaterPageHeader,
  TheaterRestrictedState,
} from "@/components/theater/TheaterShared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import type { TheaterMarkerView } from "@/convex/theaterMarkers";
import {
  theaterFactionColorClasses,
  theaterInfantryVariantLabels,
  theaterMapDateLabel,
  theaterMarkerCategoryLabels,
  theaterMarkerConcealmentLabels,
  theaterMarkerVisibilityLabels,
  type TheaterMarkerCategory,
} from "@/lib/theater";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/theater/")({
  validateSearch: (search) => ({
    event: typeof search.event === "string" ? search.event : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Teatro de Operações — Simulação da ONU" },
      {
        name: "description",
        content: `Mapa da Guerra da Coreia em ${theaterMapDateLabel}.`,
      },
    ],
  }),
  component: TheaterMapPage,
});

const noMarkers: TheaterMarkerView[] = [];

function TheaterMapPage() {
  const { event: requestedEventId } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const viewer = useQuery(api.theater.getViewer, { eventId: requestedEventId });
  const eventId = viewer?.event._id;
  const isOperator = viewer?.role === "admin" || viewer?.role === "glucon";
  const participants = useQuery(
    api.theater.listParticipants,
    eventId && isOperator ? { eventId } : "skip",
  );
  const factions = useQuery(api.theater.listFactions, eventId ? { eventId } : "skip");
  const markers =
    useQuery(api.theaterMarkers.list, eventId ? { eventId } : "skip") ?? noMarkers;
  const moveMarker = useMutation(api.theaterMarkers.move);
  const removeMarker = useMutation(api.theaterMarkers.remove);

  const [selectedMarkerId, setSelectedMarkerId] =
    useState<Id<"theaterMarkers"> | null>(null);
  const [movingMarkerId, setMovingMarkerId] =
    useState<Id<"theaterMarkers"> | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const [draft, setDraft] = useState<TheaterMarkerDraft | null>(null);

  useEffect(() => {
    setSelectedMarkerId(null);
    setMovingMarkerId(null);
    setIsPlacing(false);
    setDraft(null);
  }, [eventId]);

  useEffect(() => {
    setMovingMarkerId(null);
  }, [selectedMarkerId, draft]);

  const participantsById = useMemo(
    () => new Map((participants ?? []).map((member) => [member._id, member])),
    [participants],
  );
  const factionsById = useMemo(
    () => new Map((factions ?? []).map((faction) => [faction._id, faction])),
    [factions],
  );

  if (viewer === undefined) {
    return (
      <PageShell>
        <TheaterLoadingState />
      </PageShell>
    );
  }

  if (viewer === null) {
    return (
      <PageShell>
        <PageHeader
          title="Teatro de Operações"
          description={`Mapa da Guerra da Coreia em ${theaterMapDateLabel}.`}
        />
        <TheaterRestrictedState />
      </PageShell>
    );
  }

  const assignedParticipants = participants?.filter((member) => member.type !== "unassigned");
  const canEdit = isOperator && viewer.event.status !== "past";
  const canCreate =
    (isOperator || (viewer.role === "delegate" && viewer.factionId !== null)) &&
    viewer.event.status !== "past";
  const selectedMarker =
    markers.find((marker) => marker._id === selectedMarkerId) ?? null;
  const fullMarkers = markers.filter(
    (marker): marker is Extract<TheaterMarkerView, { kind: "full" }> =>
      marker.kind === "full",
  );
  const isMoving =
    canEdit &&
    !isPlacing &&
    draft === null &&
    selectedMarker?.kind === "full" &&
    movingMarkerId === selectedMarker._id;

  async function handleMove(markerId: Id<"theaterMarkers">, lat: number, lng: number) {
    try {
      await moveMarker({ markerId, lat, lng });
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível mover o marcador.",
      );
      return false;
    }
  }

  async function handleRemove(markerId: Id<"theaterMarkers">) {
    try {
      await removeMarker({ markerId });
      setSelectedMarkerId(null);
      setMovingMarkerId(null);
      toast.success("Marcador removido do mapa.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível remover o marcador.",
      );
    }
  }

  return (
    <PageShell>
      <TheaterPageHeader
        viewer={viewer}
        factionsById={factionsById}
        title="Teatro de Operações"
        description={
          isOperator
            ? "Mostre no mapa o que está acontecendo no front; cada participante só vê o que você liberar."
            : `Acompanhe a situação da Guerra da Coreia em ${theaterMapDateLabel}.`
        }
        onEventChange={(nextEventId) => {
          setSelectedMarkerId(null);
          setMovingMarkerId(null);
          setIsPlacing(false);
          setDraft(null);
          void navigate({ search: { event: nextEventId } });
        }}
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              render={
                <Link to="/theater/orders" search={{ event: viewer.event._id }} />
              }
              variant="outline"
            >
              <ScrollText data-icon="inline-start" />
              Ordens
            </Button>
            {canCreate ? (
              <Button
                type="button"
                variant={isPlacing ? "secondary" : "default"}
                onClick={() => {
                  setMovingMarkerId(null);
                  setIsPlacing((current) => !current);
                }}
              >
                {isPlacing ? (
                  <X data-icon="inline-start" />
                ) : (
                  <MapPinPlus data-icon="inline-start" />
                )}
                {isPlacing ? "Cancelar posicionamento" : "Adicionar marcador"}
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-2">
          {isPlacing ? (
            <p
              className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm"
              aria-live="polite"
            >
              Clique no mapa para posicionar o novo marcador.
            </p>
          ) : null}
          {isMoving ? (
            <p
              className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm"
              aria-live="polite"
            >
              Arraste o marcador selecionado para a nova posição. Use “Cancelar movimento” para sair sem mover.
            </p>
          ) : null}
          <TheaterMap
            className="h-[60svh] min-h-96 lg:h-[calc(100svh-14rem)]"
            markers={markers}
            factionsById={factionsById}
            selectedMarkerId={selectedMarkerId}
            onSelectMarker={(markerId) => {
              if (markerId !== selectedMarkerId) setMovingMarkerId(null);
              setSelectedMarkerId(markerId);
            }}
            onPlace={
              canCreate && isPlacing
                ? (position) => {
                    setIsPlacing(false);
                    setMovingMarkerId(null);
                    setDraft({ mode: "create", ...position });
                  }
                : undefined
            }
            onMove={canEdit ? handleMove : undefined}
            movableMarkerId={isMoving ? movingMarkerId : null}
            onMoveEnd={(markerId) =>
              setMovingMarkerId((current) => current === markerId ? null : current)
            }
          />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <SelectedMarkerCard
            marker={selectedMarker}
            factionsById={factionsById}
            participantsById={participantsById}
            canEdit={canEdit}
            isMoving={isMoving}
            onToggleMove={(markerId) => {
              setIsPlacing(false);
              setMovingMarkerId((current) => current === markerId ? null : markerId);
            }}
            onEdit={(marker) => {
              setMovingMarkerId(null);
              setDraft({ mode: "edit", marker });
            }}
            onRemove={handleRemove}
          />
          <LegendCard factions={factions ?? []} />
          {isOperator ? (
            <Card size="sm">
              <CardHeader>
                <CardTitle>Marcadores ({fullMarkers.length})</CardTitle>
                <CardDescription>
                  Visão do GLUCON: inclui marcadores ocultos para os participantes.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                {fullMarkers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum marcador no mapa ainda.
                  </p>
                ) : (
                  fullMarkers.map((marker) => {
                    const Icon = getTheaterMarkerIcon(marker.category, marker.infantryVariant);
                    return (
                      <button
                        key={marker._id}
                        type="button"
                        className={cn(
                          "flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted/30",
                          marker._id === selectedMarkerId && "bg-muted",
                        )}
                        onClick={() => {
                          if (marker._id !== selectedMarkerId) setMovingMarkerId(null);
                          setSelectedMarkerId(marker._id);
                        }}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{marker.title}</span>
                          {marker.category === "infantry" ? (
                            <span className="block text-xs text-muted-foreground">
                              {theaterMarkerCategoryLabels.infantry} ·{" "}
                              {theaterInfantryVariantLabels[marker.infantryVariant ?? "standard"]}
                            </span>
                          ) : null}
                        </span>
                        {marker.access && marker.access.visibility !== "public" ? (
                          <Badge variant="outline" className="ml-auto shrink-0">
                            {marker.access.visibility === "glucon" ? "GLUCON" : "Restrito"}
                          </Badge>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {eventId && canCreate ? (
        <TheaterMarkerSheet
          key={eventId}
          eventId={eventId}
          draft={draft}
          factions={factions ?? []}
          participants={assignedParticipants}
          delegationFactionId={viewer.role === "delegate" ? viewer.factionId : null}
          onClose={() => setDraft(null)}
          onSaved={(markerId) => {
            setDraft(null);
            setMovingMarkerId(null);
            setSelectedMarkerId(markerId);
          }}
        />
      ) : null}
    </PageShell>
  );
}

function SelectedMarkerCard({
  marker,
  factionsById,
  participantsById,
  canEdit,
  isMoving,
  onToggleMove,
  onEdit,
  onRemove,
}: {
  marker: TheaterMarkerView | null;
  factionsById: Map<Id<"theaterFactions">, Doc<"theaterFactions">>;
  participantsById: Map<Id<"members">, Doc<"members">>;
  canEdit: boolean;
  isMoving: boolean;
  onToggleMove: (markerId: Id<"theaterMarkers">) => void;
  onEdit: (marker: Extract<TheaterMarkerView, { kind: "full" }>) => void;
  onRemove: (markerId: Id<"theaterMarkers">) => Promise<void>;
}) {
  if (!marker) {
    return (
      <Card size="sm" className="border-dashed">
        <CardContent className="text-sm text-muted-foreground">
          Selecione um marcador no mapa para ver os detalhes.
        </CardContent>
      </Card>
    );
  }

  if (marker.kind === "obscured") {
    return (
      <Card size="sm" aria-live="polite">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CircleQuestionMark className="size-4" aria-hidden />
            {marker.label}
          </CardTitle>
          <CardDescription>
            Sua inteligência detectou atividade neste ponto, mas não conseguiu
            identificá-la.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const Icon = getTheaterMarkerIcon(marker.category, marker.infantryVariant);
  const faction = marker.factionId ? factionsById.get(marker.factionId) : null;

  return (
    <Card size="sm" aria-live="polite">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 shrink-0" aria-hidden />
          <span className="min-w-0 break-words">{marker.title}</span>
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <span>
            {theaterMarkerCategoryLabels[marker.category]}
            {marker.category === "infantry"
              ? ` · ${theaterInfantryVariantLabels[marker.infantryVariant ?? "standard"]}`
              : ""}
          </span>
          {marker.factionId ? <TheaterFactionBadge faction={faction} /> : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        {marker.description ? (
          <p className="whitespace-pre-wrap break-words">{marker.description}</p>
        ) : null}
        {marker.personnelCount !== null || marker.personnelCapacity !== null ? (
          <dl className="grid grid-cols-2 gap-3 rounded-md bg-muted/40 px-3 py-2">
            <div>
              <dt className="text-xs text-muted-foreground">Efetivo atual</dt>
              <dd className="font-medium tabular-nums">
                {marker.personnelCount?.toLocaleString("pt-BR") ?? "Não informado"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Capacidade</dt>
              <dd className="font-medium tabular-nums">
                {marker.personnelCapacity?.toLocaleString("pt-BR") ?? "Não informada"}
              </dd>
            </div>
            {marker.personnelCount !== null && marker.personnelCapacity !== null ? (
              <div className="col-span-2">
                <dt className="text-xs text-muted-foreground">Vagas disponíveis</dt>
                <dd className="font-medium tabular-nums">
                  {(marker.personnelCapacity - marker.personnelCount).toLocaleString("pt-BR")}
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
        {marker.access ? (
          <div className="flex flex-col gap-1 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <span>Visibilidade: {theaterMarkerVisibilityLabels[marker.access.visibility]}</span>
            {marker.access.visibility === "factions" || marker.access.visibility === "members" ? (
              <>
                <span>
                  Veem tudo:{" "}
                  {marker.access.visibility === "members"
                    ? marker.access.visibleToMemberIds
                        .map((memberId) => participantsById.get(memberId)?.name ?? "Participante indisponível")
                        .join(", ") || "Nenhum participante selecionado"
                    : marker.access.visibleToFactionIds
                        .map((factionId) => factionsById.get(factionId)?.name ?? "Facção removida")
                        .join(", ") || "Nenhuma facção selecionada"}
                </span>
                <span>
                  Demais: {theaterMarkerConcealmentLabels[marker.access.concealment]}
                </span>
              </>
            ) : null}
          </div>
        ) : null}
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={isMoving ? "secondary" : "outline"}
              size="sm"
              aria-pressed={isMoving}
              onClick={() => onToggleMove(marker._id)}
            >
              {isMoving ? <X data-icon="inline-start" /> : <Move data-icon="inline-start" />}
              {isMoving ? "Cancelar movimento" : "Mover"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onEdit(marker)}>
              Editar
            </Button>
            <AlertDialog>
              <AlertDialogTrigger
                render={<Button type="button" variant="outline" size="sm" />}
              >
                Remover
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover marcador?</AlertDialogTitle>
                  <AlertDialogDescription>
                    O marcador &quot;{marker.title}&quot; some do mapa de todos os
                    participantes.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => void onRemove(marker._id)}
                  >
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LegendCard({ factions }: { factions: Doc<"theaterFactions">[] }) {
  const HeavyInfantryIcon = getTheaterMarkerIcon("infantry", "heavy");
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Legenda</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm">
        <div className="flex flex-col gap-1.5">
          {factions.map((faction) => (
            <div key={faction._id} className="flex items-center gap-2">
              <span
                className={cn(
                  "size-3 shrink-0 rounded-full",
                  theaterFactionColorClasses[faction.color],
                )}
                aria-hidden
              />
              <span className="truncate">{faction.name}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span
              className="size-3 shrink-0 rounded-full border border-dashed border-zinc-400 bg-zinc-700"
              aria-hidden
            />
            <span className="text-muted-foreground">Atividade não identificada</span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {Object.entries(theaterMarkerCategoryLabels).map(([category, label]) => {
            const Icon = getTheaterMarkerIcon(category as TheaterMarkerCategory);
            return (
              <span key={category} className="flex items-center gap-1.5">
                <Icon className="size-3.5 shrink-0" aria-hidden />
                {label}{category === "infantry" ? ` · ${theaterInfantryVariantLabels.standard}` : ""}
              </span>
            );
          })}
          <span className="flex items-center gap-1.5">
            <HeavyInfantryIcon className="size-3.5 shrink-0" aria-hidden />
            Infantaria · {theaterInfantryVariantLabels.heavy}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
