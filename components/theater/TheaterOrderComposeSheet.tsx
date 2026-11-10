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
import type { TheaterDirectoryEntry } from "@/convex/theater";
import {
  theaterOrderClassificationDescriptions,
  theaterOrderClassificationLabels,
  type TheaterOrderClassification,
} from "@/lib/theater";

const classificationOptions = Object.entries(theaterOrderClassificationLabels).map(
  ([value, label]) => ({ value, label }),
);

type OrderFormValues = {
  classification: TheaterOrderClassification;
  subject: string;
  body: string;
  recipientFactionIds: string[];
  recipientMemberIds: string[];
};

const emptyOrder: OrderFormValues = {
  classification: "faction",
  subject: "",
  body: "",
  recipientFactionIds: [],
  recipientMemberIds: [],
};

export function TheaterOrderComposeSheet({
  open,
  eventId,
  viewerMemberId,
  factions,
  directory,
  onClose,
}: {
  open: boolean;
  eventId: Id<"events">;
  viewerMemberId: Id<"members">;
  factions: Doc<"theaterFactions">[];
  directory: TheaterDirectoryEntry[];
  onClose: () => void;
}) {
  const sendOrder = useMutation(api.theaterOrders.send);
  const [values, setValues] = useState(emptyOrder);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) setValues(emptyOrder);
  }, [open]);

  const factionNames = new Map(factions.map((faction) => [faction._id, faction.name]));
  const factionOptions = factions.map((faction) => ({
    value: faction._id,
    label: faction.name,
  }));
  const memberOptions = directory
    .filter((entry) => entry.memberId !== viewerMemberId)
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"))
    .map((entry) => ({
      value: entry.memberId,
      label: entry.name,
      description: [
        entry.type === "glucon"
          ? "GLUCON"
          : entry.factionId
            ? factionNames.get(entry.factionId)
            : null,
        entry.position,
      ]
        .filter(Boolean)
        .join(" · "),
    }));
  const isSecret = values.classification === "secret";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSecret && values.recipientMemberIds.length === 0) {
      toast.error("Ordens sigilosas precisam de ao menos um participante destinatário.");
      return;
    }

    setIsSubmitting(true);
    try {
      await sendOrder({
        eventId,
        classification: values.classification,
        subject: values.subject,
        body: values.body,
        recipientFactionIds: isSecret
          ? []
          : (values.recipientFactionIds as Id<"theaterFactions">[]),
        recipientMemberIds: values.recipientMemberIds as Id<"members">[],
      });
      toast.success("Ordem enviada.");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível enviar a ordem.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-border/70 bg-card p-0 sm:max-w-xl"
      >
        <SheetHeader className="border-b border-border/70 px-6 py-4">
          <SheetTitle className="text-lg font-semibold tracking-tight">Nova ordem</SheetTitle>
          <SheetDescription>
            O GLUCON recebe todas as ordens. Escolha quem mais pode lê-la.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-6 py-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="theater-order-classification">Classificação</FieldLabel>
              <TheaterOptionSelect
                id="theater-order-classification"
                value={values.classification}
                options={classificationOptions}
                onChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    classification: value as TheaterOrderClassification,
                  }))
                }
              />
              <FieldDescription>
                {theaterOrderClassificationDescriptions[values.classification]}
              </FieldDescription>
            </Field>

            {!isSecret && factionOptions.length > 0 ? (
              <FieldSet>
                <FieldLegend variant="label">Facções destinatárias</FieldLegend>
                <TheaterCheckboxList
                  idPrefix="theater-order-faction"
                  options={factionOptions}
                  value={values.recipientFactionIds}
                  onChange={(recipientFactionIds) =>
                    setValues((current) => ({ ...current, recipientFactionIds }))
                  }
                />
              </FieldSet>
            ) : null}

            <FieldSet>
              <FieldLegend variant="label">Participantes destinatários</FieldLegend>
              {memberOptions.length > 0 ? (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-border p-3">
                  <TheaterCheckboxList
                    idPrefix="theater-order-member"
                    options={memberOptions}
                    value={values.recipientMemberIds}
                    onChange={(recipientMemberIds) =>
                      setValues((current) => ({ ...current, recipientMemberIds }))
                    }
                  />
                </div>
              ) : (
                <FieldDescription>Nenhum outro participante disponível.</FieldDescription>
              )}
            </FieldSet>

            <Field>
              <FieldLabel htmlFor="theater-order-subject">Assunto</FieldLabel>
              <Input
                id="theater-order-subject"
                value={values.subject}
                maxLength={160}
                required
                placeholder="Ex.: Avançar a 2ª Divisão até Chorwon"
                onChange={(event) =>
                  setValues((current) => ({ ...current, subject: event.target.value }))
                }
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="theater-order-body">Conteúdo</FieldLabel>
              <Textarea
                id="theater-order-body"
                value={values.body}
                maxLength={8000}
                rows={8}
                required
                onChange={(event) =>
                  setValues((current) => ({ ...current, body: event.target.value }))
                }
              />
            </Field>
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
              Enviar ordem
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
