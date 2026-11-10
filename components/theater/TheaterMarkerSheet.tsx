"use client";

import { useMutation } from "convex/react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  TheaterCheckboxList,
  TheaterOptionSelect,
} from "@/components/theater/TheaterShared";
import { getTheaterMarkerIcon } from "@/components/theater/theater-marker-icons";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { TheaterMarkerView } from "@/convex/theaterMarkers";
import {
  defaultObscuredMarkerLabel,
  theaterInfantryVariantLabels,
  theaterMarkerCategoryLabels,
  theaterMarkerConcealmentLabels,
  theaterMarkerVisibilityLabels,
  type TheaterInfantryVariant,
  type TheaterMarkerCategory,
  type TheaterMarkerConcealment,
  type TheaterMarkerVisibility,
} from "@/lib/theater";

export type TheaterMarkerDraft =
  | { mode: "create"; lat: number; lng: number }
  | { mode: "edit"; marker: Extract<TheaterMarkerView, { kind: "full" }> };

type MarkerFormValues = {
  title: string;
  description: string;
  category: TheaterMarkerCategory;
  infantryVariant: TheaterInfantryVariant;
  factionId: string;
  personnelCount: string;
  personnelCapacity: string;
  visibility: TheaterMarkerVisibility;
  visibleToFactionIds: string[];
  visibleToMemberIds: string[];
  concealment: TheaterMarkerConcealment;
  obscuredLabel: string;
};

const noFactionValue = "__no_faction__";

const categoryOptions = Object.entries(theaterMarkerCategoryLabels).map(
  ([value, label]) => ({ value, label }),
);
const infantryVariantOptions = Object.entries(theaterInfantryVariantLabels).map(
  ([value, label]) => ({ value, label }),
);
const visibilityOptions = Object.entries(theaterMarkerVisibilityLabels).map(
  ([value, label]) => ({ value, label }),
);
const concealmentOptions = Object.entries(theaterMarkerConcealmentLabels).map(
  ([value, label]) => ({ value, label }),
);

function getInitialValues(draft: TheaterMarkerDraft | null): MarkerFormValues {
  if (draft?.mode === "edit") {
    const { marker } = draft;
    return {
      title: marker.title,
      description: marker.description ?? "",
      category: marker.category,
      infantryVariant: marker.infantryVariant ?? "standard",
      factionId: marker.factionId ?? noFactionValue,
      personnelCount: marker.personnelCount?.toString() ?? "",
      personnelCapacity: marker.personnelCapacity?.toString() ?? "",
      visibility: marker.access?.visibility ?? "public",
      visibleToFactionIds: marker.access?.visibleToFactionIds ?? [],
      visibleToMemberIds: marker.access?.visibleToMemberIds ?? [],
      concealment: marker.access?.concealment ?? "hidden",
      obscuredLabel: marker.access?.obscuredLabel ?? "",
    };
  }

  return {
    title: "",
    description: "",
    category: "infantry",
    infantryVariant: "standard",
    factionId: noFactionValue,
    personnelCount: "",
    personnelCapacity: "",
    visibility: "public",
    visibleToFactionIds: [],
    visibleToMemberIds: [],
    concealment: "hidden",
    obscuredLabel: "",
  };
}

export function TheaterMarkerSheet({
  eventId,
  draft,
  factions,
  participants,
  onClose,
  onSaved,
}: {
  eventId: Id<"events">;
  draft: TheaterMarkerDraft | null;
  factions: Doc<"theaterFactions">[];
  participants: Doc<"members">[] | undefined;
  onClose: () => void;
  onSaved: (markerId: Id<"theaterMarkers">) => void;
}) {
  const createMarker = useMutation(api.theaterMarkers.create);
  const updateMarker = useMutation(api.theaterMarkers.update);
  const [values, setValues] = useState(() => getInitialValues(draft));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setValues(getInitialValues(draft));
  }, [draft]);

  const factionOptions = factions.map((faction) => ({
    value: faction._id,
    label: faction.name,
  }));
  const participantOptions = (participants ?? [])
    .filter((member) => member.type !== "unassigned")
    .map((member) => ({
      value: member._id,
      label: member.name,
    }));
  const personnelCount =
    values.personnelCount === "" ? undefined : Number(values.personnelCount);
  const personnelCapacity =
    values.personnelCapacity === "" ? undefined : Number(values.personnelCapacity);
  const countInvalid =
    personnelCount !== undefined &&
    (!Number.isSafeInteger(personnelCount) || personnelCount < 0);
  const capacityInvalid =
    personnelCapacity !== undefined &&
    (!Number.isSafeInteger(personnelCapacity) || personnelCapacity < 0);
  const exceedsCapacity =
    personnelCount !== undefined &&
    personnelCapacity !== undefined &&
    personnelCount > personnelCapacity;
  const personnelError =
    countInvalid || capacityInvalid
      ? "Informe quantidades inteiras, não negativas e dentro do limite seguro."
      : exceedsCapacity
        ? "O efetivo não pode ultrapassar a capacidade."
        : null;
  const position =
    draft?.mode === "edit"
      ? { lat: draft.marker.lat, lng: draft.marker.lng }
      : draft
        ? { lat: draft.lat, lng: draft.lng }
        : null;
  const MarkerIcon = getTheaterMarkerIcon(values.category, values.infantryVariant);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !position || isSubmitting || personnelError) return;

    const input = {
      title: values.title,
      description: values.description || undefined,
      category: values.category,
      ...(values.category === "infantry"
        ? { infantryVariant: values.infantryVariant }
        : {}),
      factionId:
        values.factionId === noFactionValue
          ? undefined
          : (values.factionId as Id<"theaterFactions">),
      personnelCount,
      personnelCapacity,
      lat: position.lat,
      lng: position.lng,
      visibility: values.visibility,
      visibleToFactionIds:
        values.visibility === "factions"
          ? (values.visibleToFactionIds as Id<"theaterFactions">[])
          : [],
      visibleToMemberIds:
        values.visibility === "members"
          ? (values.visibleToMemberIds as Id<"members">[])
          : [],
      concealment:
        values.visibility === "factions" || values.visibility === "members"
          ? values.concealment
          : "hidden",
      obscuredLabel:
        (values.visibility === "factions" || values.visibility === "members") &&
        values.concealment === "obscured"
          ? values.obscuredLabel || undefined
          : undefined,
    };

    setIsSubmitting(true);
    try {
      if (draft.mode === "create") {
        const markerId = await createMarker({ eventId, ...input });
        toast.success("Marcador adicionado ao mapa.");
        onSaved(markerId);
      } else {
        await updateMarker({ markerId: draft.marker._id, ...input });
        toast.success("Marcador atualizado.");
        onSaved(draft.marker._id);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível salvar o marcador.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet
      open={draft !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-border/70 bg-card p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border/70 px-6 py-4">
          <SheetTitle className="text-lg font-semibold tracking-tight">
            {draft?.mode === "edit" ? "Editar marcador" : "Novo marcador"}
          </SheetTitle>
          <SheetDescription>
            {position
              ? `Posição: ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}. Use “Mover” nos detalhes do marcador para reposicioná-lo.`
              : null}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="theater-marker-title">Título</FieldLabel>
              <Input
                id="theater-marker-title"
                value={values.title}
                maxLength={120}
                required
                placeholder="Ex.: 1ª Divisão de Fuzileiros"
                onChange={(event) =>
                  setValues((current) => ({ ...current, title: event.target.value }))
                }
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="theater-marker-category">Categoria</FieldLabel>
                <TheaterOptionSelect
                  id="theater-marker-category"
                  value={values.category}
                  options={categoryOptions}
                  onChange={(value) =>
                    setValues((current) => ({
                      ...current,
                      category: value as TheaterMarkerCategory,
                    }))
                  }
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="theater-marker-faction">Facção</FieldLabel>
                <TheaterOptionSelect
                  id="theater-marker-faction"
                  value={values.factionId}
                  options={[
                    { value: noFactionValue, label: "Sem facção" },
                    ...factionOptions,
                  ]}
                  onChange={(value) =>
                    setValues((current) => ({ ...current, factionId: value }))
                  }
                />
              </Field>
            </div>

            {values.category === "infantry" ? (
              <Field>
                <FieldLabel htmlFor="theater-marker-infantry-variant">
                  Tipo de infantaria
                </FieldLabel>
                <TheaterOptionSelect
                  id="theater-marker-infantry-variant"
                  value={values.infantryVariant}
                  options={infantryVariantOptions}
                  onChange={(value) =>
                    setValues((current) => ({
                      ...current,
                      infantryVariant: value as TheaterInfantryVariant,
                    }))
                  }
                />
              </Field>
            ) : null}

            <div className="flex items-center gap-2 rounded-md bg-muted/40 px-3 py-2 text-sm">
              <MarkerIcon className="size-5 shrink-0" aria-hidden />
              <span>
                {theaterMarkerCategoryLabels[values.category]}
                {values.category === "infantry"
                  ? ` · ${theaterInfantryVariantLabels[values.infantryVariant]}`
                  : ""}
              </span>
            </div>

            <FieldSet>
              <FieldLegend variant="label">Pessoal</FieldLegend>
              <FieldDescription id="theater-marker-personnel-help">
                Deixe em branco quando a quantidade não for informada.
              </FieldDescription>
              <FieldGroup className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={countInvalid || exceedsCapacity}>
                  <FieldLabel htmlFor="theater-marker-personnel-count">
                    Efetivo atual
                  </FieldLabel>
                  <Input
                    id="theater-marker-personnel-count"
                    type="number"
                    min={0}
                    max={Number.MAX_SAFE_INTEGER}
                    step={1}
                    value={values.personnelCount}
                    aria-invalid={countInvalid || exceedsCapacity}
                    aria-describedby="theater-marker-personnel-help theater-marker-personnel-feedback"
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        personnelCount: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field data-invalid={capacityInvalid || exceedsCapacity}>
                  <FieldLabel htmlFor="theater-marker-personnel-capacity">
                    Capacidade de pessoal
                  </FieldLabel>
                  <Input
                    id="theater-marker-personnel-capacity"
                    type="number"
                    min={0}
                    max={Number.MAX_SAFE_INTEGER}
                    step={1}
                    value={values.personnelCapacity}
                    aria-invalid={capacityInvalid || exceedsCapacity}
                    aria-describedby="theater-marker-personnel-help theater-marker-personnel-feedback"
                    onChange={(event) =>
                      setValues((current) => ({
                        ...current,
                        personnelCapacity: event.target.value,
                      }))
                    }
                  />
                </Field>
              </FieldGroup>
              <div id="theater-marker-personnel-feedback" aria-live="polite">
                {personnelError ? (
                  <FieldError>{personnelError}</FieldError>
                ) : personnelCount !== undefined && personnelCapacity !== undefined ? (
                  <FieldDescription>
                    {personnelCount.toLocaleString("pt-BR")} de{" "}
                    {personnelCapacity.toLocaleString("pt-BR")} pessoas;{" "}
                    {(personnelCapacity - personnelCount).toLocaleString("pt-BR")} vagas disponíveis.
                  </FieldDescription>
                ) : null}
              </div>
            </FieldSet>

            <Field>
              <FieldLabel htmlFor="theater-marker-description">Descrição</FieldLabel>
              <Textarea
                id="theater-marker-description"
                value={values.description}
                maxLength={2000}
                rows={4}
                placeholder="O que está acontecendo neste ponto?"
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="theater-marker-visibility">Quem pode ver</FieldLabel>
              <TheaterOptionSelect
                id="theater-marker-visibility"
                value={values.visibility}
                options={visibilityOptions}
                onChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    visibility: value as TheaterMarkerVisibility,
                    visibleToFactionIds: [],
                    visibleToMemberIds: [],
                  }))
                }
              />
              <FieldDescription>
                O GLUCON e a administração sempre veem todos os marcadores.
              </FieldDescription>
            </Field>

            {values.visibility === "factions" || values.visibility === "members" ? (
              <>
                {values.visibility === "factions" ? (
                  <FieldSet>
                    <FieldLegend variant="label">Facções com visão completa</FieldLegend>
                    {factionOptions.length > 0 ? (
                      <TheaterCheckboxList
                        idPrefix="theater-marker-visible-to-faction"
                        options={factionOptions}
                        value={values.visibleToFactionIds}
                        onChange={(visibleToFactionIds) =>
                          setValues((current) => ({ ...current, visibleToFactionIds }))
                        }
                      />
                    ) : (
                      <FieldDescription>
                        Cadastre facções na administração do teatro primeiro.
                      </FieldDescription>
                    )}
                  </FieldSet>
                ) : (
                  <FieldSet>
                    <FieldLegend variant="label">Participantes com visão completa</FieldLegend>
                    {participantOptions.length > 0 ? (
                      <TheaterCheckboxList
                        idPrefix="theater-marker-visible-to-member"
                        options={participantOptions}
                        value={values.visibleToMemberIds}
                        onChange={(visibleToMemberIds) =>
                          setValues((current) => ({ ...current, visibleToMemberIds }))
                        }
                      />
                    ) : (
                      <FieldDescription aria-live="polite">
                        {participants === undefined
                          ? "Carregando participantes..."
                          : "Nenhum participante com função definida nesta edição."}
                      </FieldDescription>
                    )}
                  </FieldSet>
                )}

                <Field>
                  <FieldLabel htmlFor="theater-marker-concealment">
                    Para os demais participantes
                  </FieldLabel>
                  <TheaterOptionSelect
                    id="theater-marker-concealment"
                    value={values.concealment}
                    options={concealmentOptions}
                    onChange={(value) =>
                      setValues((current) => ({
                        ...current,
                        concealment: value as TheaterMarkerConcealment,
                      }))
                    }
                  />
                  <FieldDescription>
                    &quot;Não identificado&quot; mostra só a posição e um rótulo genérico,
                    sem título, descrição, facção ou informações de pessoal.
                  </FieldDescription>
                </Field>

                {values.concealment === "obscured" ? (
                  <Field>
                    <FieldLabel htmlFor="theater-marker-obscured-label">
                      Rótulo para os demais participantes
                    </FieldLabel>
                    <Input
                      id="theater-marker-obscured-label"
                      value={values.obscuredLabel}
                      maxLength={120}
                      placeholder={defaultObscuredMarkerLabel}
                      onChange={(event) =>
                        setValues((current) => ({
                          ...current,
                          obscuredLabel: event.target.value,
                        }))
                      }
                    />
                  </Field>
                ) : null}
              </>
            ) : null}
          </FieldGroup>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border/70 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || personnelError !== null}>
              {draft?.mode === "edit" ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
