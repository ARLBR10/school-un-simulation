import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import type { DynamicTableFilter } from "@/components/admin/DynamicTable";
import type { Doc, Id } from "@/convex/_generated/dataModel";

type EventScopedRow = Record<string, ReactNode> & {
  eventId?: Id<"events">;
};

export function useAdminEventFilter(events: Doc<"events">[] | null | undefined) {
  const activeEvent = events?.find((event) => event.status === "active") ?? null;
  const [eventId, setEventId] = useState<Id<"events"> | "">("");

  useEffect(() => {
    if (activeEvent) {
      setEventId(activeEvent._id);
    }
  }, [activeEvent?._id]);

  return {
    activeEvent,
    eventId,
    filter: {
      id: "event",
      label: "Evento",
      value: eventId,
      options: [...(events ?? [])]
        .sort((left, right) => {
          if (left.status === "active") return -1;
          if (right.status === "active") return 1;
          return right.year - left.year;
        })
        .map((event) => ({
          value: event._id,
          label: event.status === "active" ? `${event.name} (atual)` : event.name,
        })),
      onValueChange: (value: string) => setEventId(value as Id<"events">),
      matches: (row, value) =>
        isRowFromSelectedEvent(row.eventId, value as Id<"events">, activeEvent),
    } satisfies DynamicTableFilter<EventScopedRow>,
  };
}

export function isRowFromSelectedEvent(
  rowEventId: Id<"events"> | undefined,
  selectedEventId: Id<"events"> | "",
  activeEvent: Doc<"events"> | null,
) {
  if (!selectedEventId) return true;
  if (rowEventId === selectedEventId) return true;

  return rowEventId === undefined && activeEvent?.slug === "school-onu-2026";
}
