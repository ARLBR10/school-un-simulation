"use client";

import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { TheaterViewerSummary } from "@/convex/theater";
import {
  theaterFactionColorClasses,
  theaterMapDateLabel,
  theaterRoleLabels,
} from "@/lib/theater";
import { cn } from "@/lib/utils";

export type TheaterOption = { value: string; label: string; description?: string };

export function TheaterOptionSelect({
  id,
  ariaLabel,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  id?: string;
  ariaLabel?: string;
  value: string;
  options: TheaterOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Select
      items={options}
      value={value}
      disabled={disabled}
      onValueChange={(nextValue) => onChange(nextValue ?? "")}
    >
      <SelectTrigger id={id} aria-label={ariaLabel} className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export function TheaterCheckboxList({
  idPrefix,
  options,
  value,
  disabled,
  onChange,
}: {
  idPrefix: string;
  options: TheaterOption[];
  value: string[];
  disabled?: boolean;
  onChange: (value: string[]) => void;
}) {
  return (
    <FieldGroup className="gap-3">
      {options.map((option) => (
        <Field key={option.value} orientation="horizontal">
          <Checkbox
            id={`${idPrefix}-${option.value}`}
            checked={value.includes(option.value)}
            disabled={disabled}
            onCheckedChange={(checked) =>
              onChange(
                checked
                  ? [...value, option.value]
                  : value.filter((item) => item !== option.value),
              )
            }
          />
          <FieldLabel
            htmlFor={`${idPrefix}-${option.value}`}
            className="flex-col items-start gap-0.5"
          >
            <span>{option.label}</span>
            {option.description ? (
              <FieldDescription className="text-xs">{option.description}</FieldDescription>
            ) : null}
          </FieldLabel>
        </Field>
      ))}
    </FieldGroup>
  );
}

export function TheaterFactionBadge({
  faction,
  className,
}: {
  faction: Pick<Doc<"theaterFactions">, "name" | "color"> | null | undefined;
  className?: string;
}) {
  if (!faction) {
    return (
      <Badge variant="outline" className={className}>
        Facção removida
      </Badge>
    );
  }

  return (
    <Badge className={cn(theaterFactionColorClasses[faction.color], className)}>
      {faction.name}
    </Badge>
  );
}

export function TheaterPageHeader({
  viewer,
  factionsById,
  title,
  description,
  action,
  onEventChange,
}: {
  viewer: TheaterViewerSummary;
  factionsById: Map<Id<"theaterFactions">, Doc<"theaterFactions">>;
  title: string;
  description: string;
  action?: ReactNode;
  onEventChange: (eventId: Id<"events">) => void;
}) {
  const eventOptions = viewer.events.map((event) => ({
    value: event._id,
    label: event.status === "past" ? `${event.name} (evento passado)` : event.name,
  }));

  return (
    <div className="flex flex-col gap-3">
      <PageHeader title={title} description={description} action={action} />
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{viewer.event.name}</Badge>
        {viewer.event.status === "past" ? (
          <Badge variant="destructive">Evento passado · somente leitura</Badge>
        ) : null}
        <Badge variant="secondary">{theaterMapDateLabel}</Badge>
        <Badge variant="secondary">{theaterRoleLabels[viewer.role]}</Badge>
        {viewer.factionId ? (
          <TheaterFactionBadge faction={factionsById.get(viewer.factionId)} />
        ) : null}
        {viewer.events.length > 1 ? (
          <div className="w-full sm:w-72">
            <TheaterOptionSelect
              ariaLabel="Teatro de operações"
              value={viewer.event._id}
              options={eventOptions}
              onChange={(value) => {
                if (value) onEventChange(value as Id<"events">);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function TheaterRestrictedState() {
  return (
    <Card className="border-dashed">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold">Acesso exclusivo do teatro de operações</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta área é reservada aos participantes com função definida em um teatro de
          operações. Procure a coordenação se você deveria ter acesso.
        </p>
      </CardContent>
    </Card>
  );
}

export function TheaterLoadingState() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-live="polite">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <Skeleton className="h-[60svh] min-h-96 w-full rounded-xl" />
    </div>
  );
}
