"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { CircleQuestionMark } from "lucide-react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
// MapLibre derives its worker URL from import.meta.url, which bundling rewrites.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { getTheaterMarkerIcon } from "@/components/theater/theater-marker-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { TheaterMarkerView } from "@/convex/theaterMarkers";
import {
  koreaBounds,
  koreaInitialBounds,
  koreaMaxZoom,
  theaterFactionColorClasses,
  theaterMapDate,
  theaterMapStyleUrl,
  theaterMarkerCategoryLabels,
  theaterInfantryVariantLabels,
} from "@/lib/theater";
import { cn } from "@/lib/utils";

type MarkerId = Id<"theaterMarkers">;

type TheaterMapProps = {
  markers: TheaterMarkerView[];
  factionsById: Map<Id<"theaterFactions">, Doc<"theaterFactions">>;
  selectedMarkerId: MarkerId | null;
  onSelectMarker: (markerId: MarkerId | null) => void;
  /** When set, the next map click places a marker instead of clearing the selection. */
  onPlace?: (position: { lat: number; lng: number }) => void;
  /** Only this explicitly armed marker can be dragged. */
  movableMarkerId?: MarkerId | null;
  /** Resolve `false` to snap back; markers are locked again after each attempt. */
  onMove?: (markerId: MarkerId, lat: number, lng: number) => Promise<boolean>;
  onMoveEnd?: (markerId: MarkerId) => void;
  className?: string;
};

export function TheaterMap({
  markers,
  factionsById,
  selectedMarkerId,
  onSelectMarker,
  onPlace,
  onMove,
  movableMarkerId = null,
  onMoveEnd,
  className,
}: TheaterMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapMarkersRef = useRef(new Map<MarkerId, MapLibreMarker>());
  const markerClassRef = useRef<typeof MapLibreMarker | null>(null);
  const [draggingMarkerId, setDraggingMarkerId] = useState<MarkerId | null>(null);
  const [savingMarkerIds, setSavingMarkerIds] = useState<Set<MarkerId>>(
    () => new Set(),
  );
  const [markerElements, setMarkerElements] = useState(
    () => new Map<MarkerId, HTMLElement>(),
  );

  // Handlers change every render; map listeners read them through refs.
  const markersRef = useRef(markers);
  const onSelectRef = useRef(onSelectMarker);
  const onPlaceRef = useRef(onPlace);
  const onMoveRef = useRef(onMove);
  const movableMarkerRef = useRef(movableMarkerId);
  const onMoveEndRef = useRef(onMoveEnd);
  markersRef.current = markers;
  onSelectRef.current = onSelectMarker;
  onPlaceRef.current = onPlace;
  onMoveRef.current = onMove;
  movableMarkerRef.current = movableMarkerId;
  onMoveEndRef.current = onMoveEnd;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let createdMap: MapLibreMap | null = null;
    let resizeObserver: ResizeObserver | null = null;

    void Promise.all([
      import("maplibre-gl"),
      import("@openhistoricalmap/maplibre-gl-dates"),
    ])
      .then(([maplibregl, { filterByDate }]) => {
        if (disposed) return;

        maplibregl.setWorkerUrl(maplibreWorkerUrl);
        const [west, south, east, north] = koreaBounds;
        const nextMap = new maplibregl.Map({
          container,
          style: theaterMapStyleUrl,
          bounds: [...koreaInitialBounds],
          fitBoundsOptions: { padding: 16 },
          maxZoom: koreaMaxZoom,
          maxBounds: [
            [west, south],
            [east, north],
          ],
          renderWorldCopies: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          attributionControl: { compact: true },
        });
        createdMap = nextMap;
        nextMap.touchZoomRotate.disableRotation();
        nextMap.keyboard.disableRotation();
        nextMap.addControl(
          new maplibregl.NavigationControl({ showCompass: false }),
          "top-right",
        );
        nextMap.once("styledata", () => {
          filterByDate(nextMap, theaterMapDate);
          // OHM vector tiles expose translated names with underscores, not colons.
          // Keep airport references and other non-name text fields unchanged.
          for (const layer of nextMap.getStyle().layers) {
            if (layer.type !== "symbol") continue;
            const textField = layer.layout?.["text-field"];
            if (
              !Array.isArray(textField) ||
              textField.length !== 2 ||
              textField[0] !== "get" ||
              textField[1] !== "name"
            ) continue;
            nextMap.setLayoutProperty(layer.id, "text-field", [
              "coalesce",
              ["get", "name_en"],
              ["get", "int_name"],
              ["get", "name_latin"],
              ["get", "name"],
            ]);
          }
        });
        nextMap.on("error", (event) => {
          console.error("OpenHistoricalMap error", event.error.message);
        });
        nextMap.on("click", (event) => {
          const target = event.originalEvent.target;
          if (target instanceof Element && target.closest(".maplibregl-marker")) {
            return;
          }
          if (onPlaceRef.current) {
            onPlaceRef.current({ lat: event.lngLat.lat, lng: event.lngLat.lng });
            return;
          }
          onSelectRef.current(null);
        });

        resizeObserver = new ResizeObserver(() => nextMap.resize());
        resizeObserver.observe(container);
        markerClassRef.current = maplibregl.Marker;
        setMap(nextMap);
      })
      .catch((error: unknown) => {
        console.error("Failed to load the theater map", error);
        if (!disposed) {
          setMapError("Não foi possível carregar o mapa histórico.");
        }
      });

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      for (const marker of mapMarkersRef.current.values()) marker.remove();
      mapMarkersRef.current.clear();
      createdMap?.remove();
      setMap(null);
    };
  }, []);

  useEffect(() => {
    if (!map) return;
    map.getCanvas().style.cursor = onPlace ? "crosshair" : "";
  }, [map, onPlace]);

  const canMove = Boolean(onMove);

  useEffect(() => {
    const MarkerClass = markerClassRef.current;
    if (!map || !MarkerClass) return;

    let elementsChanged = false;
    const mapMarkers = mapMarkersRef.current;
    const nextIds = new Set(markers.map((marker) => marker._id));

    for (const [markerId, mapMarker] of mapMarkers) {
      if (!nextIds.has(markerId)) {
        mapMarker.remove();
        mapMarkers.delete(markerId);
        elementsChanged = true;
      }
    }

    for (const marker of markers) {
      const draggable =
        canMove &&
        marker.kind === "full" &&
        marker._id === movableMarkerId &&
        !savingMarkerIds.has(marker._id);
      const existing = mapMarkers.get(marker._id);
      if (existing) {
        if (marker._id !== draggingMarkerId && !savingMarkerIds.has(marker._id)) {
          existing.setLngLat([marker.lng, marker.lat]);
        }
        existing.setDraggable(draggable);
        continue;
      }

      const mapMarker = new MarkerClass({
        element: document.createElement("div"),
        anchor: "center",
        draggable,
        clickTolerance: 10,
      })
        .setLngLat([marker.lng, marker.lat])
        .addTo(map);
      mapMarker.on("dragstart", () => setDraggingMarkerId(marker._id));
      mapMarker.on("dragend", () => {
        setDraggingMarkerId(null);
        mapMarker.setDraggable(false);
        const move = onMoveRef.current;
        const latest = markersRef.current.find((item) => item._id === marker._id);
        if (!move || movableMarkerRef.current !== marker._id) {
          if (latest) mapMarker.setLngLat([latest.lng, latest.lat]);
          onMoveEndRef.current?.(marker._id);
          return;
        }
        setSavingMarkerIds((current) => new Set(current).add(marker._id));
        const { lat, lng } = mapMarker.getLngLat();
        void move(marker._id, lat, lng)
          .then((moved) => {
            const latest = markersRef.current.find((item) => item._id === marker._id);
            if (!moved && latest) mapMarker.setLngLat([latest.lng, latest.lat]);
          })
          .finally(() => {
            setSavingMarkerIds((current) => {
              const next = new Set(current);
              next.delete(marker._id);
              return next;
            });
            onMoveEndRef.current?.(marker._id);
          });
      });
      mapMarkers.set(marker._id, mapMarker);
      elementsChanged = true;
    }

    if (elementsChanged) {
      setMarkerElements(
        new Map(
          [...mapMarkers].map(([markerId, mapMarker]) => [
            markerId,
            mapMarker.getElement(),
          ]),
        ),
      );
    }
  }, [map, markers, canMove, movableMarkerId, draggingMarkerId, savingMarkerIds]);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-border bg-muted",
        className,
      )}
    >
      <div
        ref={containerRef}
        // maplibre-gl.css forces `position: relative` on the container, so size it explicitly.
        className="size-full"
        role="region"
        aria-label="Mapa histórico da península coreana"
      />
      {!map && !mapError ? (
        <div
          className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
          aria-live="polite"
        >
          Carregando mapa histórico...
        </div>
      ) : null}
      {mapError ? (
        <div
          className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-destructive"
          role="alert"
        >
          {mapError}
        </div>
      ) : null}
      {markers.map((marker) => {
        const element = markerElements.get(marker._id);
        if (!element) return null;

        return createPortal(
          <TheaterMarkerBadge
            marker={marker}
            faction={
              marker.kind === "full" && marker.factionId
                ? (factionsById.get(marker.factionId) ?? null)
                : null
            }
            isSelected={marker._id === selectedMarkerId}
            isDragging={marker._id === draggingMarkerId}
            isSaving={savingMarkerIds.has(marker._id)}
            isMovable={canMove && marker._id === movableMarkerId}
            onSelect={() => onSelectMarker(marker._id)}
          />,
          element,
          marker._id,
        );
      })}
    </div>
  );
}

function TheaterMarkerBadge({
  marker,
  faction,
  isSelected,
  isDragging,
  isSaving,
  isMovable,
  onSelect,
}: {
  marker: TheaterMarkerView;
  faction: Doc<"theaterFactions"> | null;
  isSelected: boolean;
  isDragging: boolean;
  isSaving: boolean;
  isMovable: boolean;
  onSelect: () => void;
}) {
  const Icon =
    marker.kind === "full"
      ? getTheaterMarkerIcon(marker.category, marker.infantryVariant)
      : CircleQuestionMark;
  const label = marker.kind === "full" ? marker.title : marker.label;
  const personnelCount = marker.kind === "full" ? marker.personnelCount : null;
  const personnelCapacity = marker.kind === "full" ? marker.personnelCapacity : null;
  const atCapacity =
    personnelCount !== null &&
    personnelCapacity !== null &&
    personnelCount >= personnelCapacity;

  return (
    <Tooltip>
      <TooltipTrigger
        className={cn(
          "group relative flex flex-col items-center outline-none",
          isMovable && !isSaving ? "cursor-grab" : "cursor-pointer",
        )}
        aria-label={label}
        aria-pressed={isSelected}
        aria-busy={isSaving}
        onClick={onSelect}
      >
        <span
          className={cn(
            "flex size-9 items-center justify-center border-2 border-background shadow-md transition-[transform,box-shadow,opacity] duration-200 group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-ring motion-reduce:transition-none",
            marker.kind === "obscured"
              ? "rounded-full border-dashed bg-muted text-muted-foreground"
              : cn(
                  ["infantry", "armor", "artillery", "supply"].includes(marker.category)
                    ? "rounded-lg"
                    : "rounded-full",
                  faction
                    ? theaterFactionColorClasses[faction.color]
                    : "bg-foreground text-background",
                ),
            isSelected && "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background",
            isDragging && "scale-125 cursor-grabbing shadow-xl",
            isSaving && "opacity-60",
            atCapacity && "ring-2 ring-warning",
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>
        {personnelCount !== null ? (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute -bottom-2 rounded-full border border-border bg-background px-1.5 text-[10px] font-semibold tabular-nums text-foreground shadow-sm",
              atCapacity && "bg-warning text-warning-foreground",
            )}
          >
            {personnelCount.toLocaleString("pt-BR")}
          </span>
        ) : null}
        {isSelected ? (
          <span className="pointer-events-none absolute top-full mt-3 max-w-40 truncate rounded-md bg-background/90 px-1.5 py-0.5 text-xs font-medium text-foreground shadow-sm">
            {label}
          </span>
        ) : null}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={12}
        className="w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-popover p-0 text-popover-foreground shadow-xl [&_[data-slot=tooltip-arrow]]:bg-popover [&_[data-slot=tooltip-arrow]]:fill-popover"
      >
        <div className="flex w-full min-w-0 flex-col text-left">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-4" aria-hidden />
            </span>
            <p className="min-w-0 break-words text-sm font-semibold leading-snug">
              {label}
            </p>
          </div>
          {marker.kind === "full" ? (
            <div className="flex flex-col gap-3 px-4 py-3">
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2">
                <dt className="text-muted-foreground">Categoria:</dt>
                <dd className="break-words font-medium">
                  {theaterMarkerCategoryLabels[marker.category]}
                  {marker.infantryVariant
                    ? ` · ${theaterInfantryVariantLabels[marker.infantryVariant]}`
                    : ""}
                </dd>
                <dt className="text-muted-foreground">Facção:</dt>
                <dd className="break-words font-medium">{faction?.name ?? "Sem facção"}</dd>
                <dt className="text-muted-foreground">Efetivo:</dt>
                <dd className="font-medium tabular-nums">
                  {personnelCount !== null
                    ? `${personnelCount.toLocaleString("pt-BR")} pessoas`
                    : "Não informado"}
                </dd>
                <dt className="text-muted-foreground">Capacidade:</dt>
                <dd className="font-medium tabular-nums">
                  {personnelCapacity !== null
                    ? `${personnelCapacity.toLocaleString("pt-BR")} pessoas`
                    : "Não informada"}
                </dd>
                <dt className="text-muted-foreground">Posição:</dt>
                <dd className="tabular-nums">
                  {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                </dd>
              </dl>
              {atCapacity ? (
                <p className="font-medium text-warning-foreground">
                  Capacidade máxima atingida
                </p>
              ) : null}
              <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                <p className="font-medium text-muted-foreground">Descrição:</p>
                <p className="line-clamp-5 whitespace-pre-line break-words leading-relaxed">
                  {marker.description || "Sem descrição."}
                </p>
              </div>
            </div>
          ) : (
            <p className="px-4 py-3 leading-relaxed text-muted-foreground">
              Detalhes restritos para este participante.
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
