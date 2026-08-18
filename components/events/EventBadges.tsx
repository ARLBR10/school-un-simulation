import { History } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function EventBadges({
  eventName,
  isPastEvent,
  className,
}: {
  eventName: string | null;
  isPastEvent: boolean;
  className?: string;
}) {
  if (!eventName) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Badge variant="outline">{eventName}</Badge>
      {isPastEvent ? (
        <Badge variant="secondary">
          <History data-icon="inline-start" />
          Evento passado
        </Badge>
      ) : null}
    </div>
  );
}
