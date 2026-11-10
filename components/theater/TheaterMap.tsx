"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { CircleQuestionMark } from "lucide-react";
import type { Map as MapLibreMap, Marker as MapLibreMarker } from "maplibre-gl";
// MapLibre derives its worker URL from import.meta.url, which bundling rewrites.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?url";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { theaterMarkerCategoryIcons } from "@/components/theater/theater-marker-icons";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { TheaterMarkerView } from "@/convex/theaterMarkers";
import {
  koreaBounds,
  koreaInitialBounds,
  koreaMaxZoom,
  theaterFactionColorClasses,
  theaterMapDate,
  theaterMapStyleUrl,
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
  /** When set, fully visible markers can be dragged; resolve `false` to snap back. */
  onMove?: (markerId: MarkerId, lat: number, lng: number) => Promise<boolean>;
  className?: string;
};

export function TheaterMap({
  markers,
  factionsById,
  selectedMarkerId,
  onSelectMarker,
  onPlace,
  onMove,
  className,
}: TheaterMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const mapMarkersRef = useRef(new Map<MarkerId, MapLibreMarker>());
  const markerClassRef = useRef<typeof MapLibreMarker | null>(null);
  const [markerElements, setMarkerElements] = useState(
    () => new Map<MarkerId, HTMLElement>(),
  );

  // Handlers change every render; map listeners read them through refs.
  const markersRef = useRef(markers);
  const onSelectRef = useRef(onSelectMarker);
  const onPlaceRef = useRef(onPlace);
  const onMoveRef = useRef(onMove);
  markersRef.current = markers;
  onSelectRef.current = onSelectMarker;
  onPlaceRef.current = onPlace;
  onMoveRef.current = onMove;

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
      const draggable = canMove && marker.kind === "full";
      const existing = mapMarkers.get(marker._id);
      if (existing) {
        existing.setLngLat([marker.lng, marker.lat]);
        existing.setDraggable(draggable);
        continue;
      }

      const mapMarker = new MarkerClass({
        element: document.createElement("div"),
        anchor: "center",
        draggable,
      })
        .setLngLat([marker.lng, marker.lat])
        .addTo(map);
      mapMarker.on("dragend", () => {
        const { lat, lng } = mapMarker.getLngLat();
        void onMoveRef.current?.(marker._id, lat, lng).then((moved) => {
          const latest = markersRef.current.find((item) => item._id === marker._id);
          if (!moved && latest) mapMarker.setLngLat([latest.lng, latest.lat]);
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
  }, [map, markers, canMove]);

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
  onSelect,
}: {
  marker: TheaterMarkerView;
  faction: Doc<"theaterFactions"> | null;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const Icon =
    marker.kind === "full"
      ? theaterMarkerCategoryIcons[marker.category]
      : CircleQuestionMark;
  const label = marker.kind === "full" ? marker.title : marker.label;

  return (
    <button
      type="button"
      className="group relative flex flex-col items-center outline-none"
      aria-label={label}
      aria-pressed={isSelected}
      onClick={onSelect}
    >
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-full border-2 border-background shadow-md transition-transform group-hover:scale-110 group-focus-visible:ring-2 group-focus-visible:ring-ring",
          marker.kind === "obscured"
            ? "border-dashed bg-zinc-700 text-zinc-100"
            : faction
              ? theaterFactionColorClasses[faction.color]
              : "bg-foreground text-background",
          isSelected && "scale-110 ring-2 ring-primary ring-offset-2 ring-offset-background",
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span
        className={cn(
          "pointer-events-none absolute top-full mt-1 max-w-40 truncate rounded-md bg-background/90 px-1.5 py-0.5 text-xs font-medium text-foreground shadow-sm",
          isSelected ? "block" : "hidden group-hover:block group-focus-visible:block",
        )}
      >
        {label}
      </span>
    </button>
  );
}
