declare module "@openhistoricalmap/maplibre-gl-dates" {
  import type { Map } from "maplibre-gl";

  /** Filters every OpenHistoricalMap style layer to features that existed on `date` (YYYY, YYYY-MM or YYYY-MM-DD). */
  export function filterByDate(map: Map, date: string | Date): void;
}
