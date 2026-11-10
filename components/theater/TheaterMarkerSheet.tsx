"use client";

import { useMutation } from "convex/react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  TheaterCheckboxList,
  TheaterOptionSelect,
} from "@/components/theater/TheaterShared";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
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
  theaterMarkerCategoryLabels,
  theaterMarkerConcealmentLabels,
  theaterMarkerVisibilityLabels,
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
  factionId: string;
  visibility: TheaterMarkerVisibility;
  visibleToFactionIds: string[];
  concealment: TheaterMarkerConcealment;
  obscuredLabel: string;
};

const noFactionValue = "__no_faction__";

const categoryOptions = Object.entries(theaterMarkerCategoryLabels).map(
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
      factionId: marker.factionId ?? noFactionValue,
      visibility: marker.access?.visibility ?? "public",
      visibleToFactionIds: marker.access?.visibleToFactionIds ?? [],
      concealment: marker.access?.concealment ?? "hidden",
      obscuredLabel: marker.access?.obscuredLabel ?? "",
    };
  }

  return {
    title: "",
    description: "",
    category: "infantry",
    factionId: noFactionValue,
    visibility: "public",
    visibleToFactionIds: [],
    concealment: "hidden",
    obscuredLabel: "",
  };
}

export function TheaterMarkerSheet({
  eventId,
  draft,
  factions,
  onClose,
  onSaved,
}: {
  eventId: Id<"events">;
  draft: TheaterMarkerDraft | null;
  factions: Doc<"theaterFactions">[];
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
  const position =
    draft?.mode === "edit"
      ? { lat: draft.marker.lat, lng: draft.marker.lng }
      : draft
        ? { lat: draft.lat, lng: draft.lng }
        : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !position) return;

    const input = {
      title: values.title,
      description: values.description || undefined,
      category: values.category,
      factionId:
        values.factionId === noFactionValue
          ? undefined
          : (values.factionId as Id<"theaterFactions">),
      lat: position.lat,
      lng: position.lng,
      visibility: values.visibility,
      visibleToFactionIds: values.visibleToFactionIds as Id<"theaterFactions">[],
      concealment: values.concealment,
      obscuredLabel: values.obscuredLabel || undefined,
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
              ? `Posição: ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}. Arraste o marcador no mapa para reposicioná-lo.`
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
                  }))
                }
              />
              <FieldDescription>
                O GLUCON e a administração sempre veem todos os marcadores.
              </FieldDescription>
            </Field>

            {values.visibility === "factions" ? (
              <>
                <FieldSet>
                  <FieldLegend variant="label">Facções com visão completa</FieldLegend>
                  {factionOptions.length > 0 ? (
                    <TheaterCheckboxList
                      idPrefix="theater-marker-visible-to"
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

                <Field>
                  <FieldLabel htmlFor="theater-marker-concealment">
                    Para as demais facções
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
                    sem título, descrição ou facção.
                  </FieldDescription>
                </Field>

                {values.concealment === "obscured" ? (
                  <Field>
                    <FieldLabel htmlFor="theater-marker-obscured-label">
                      Rótulo para as demais facções
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
            <Button type="submit" disabled={isSubmitting}>
              {draft?.mode === "edit" ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
