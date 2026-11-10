import type { Doc } from "@/convex/_generated/dataModel";

export type TheaterRole = "admin" | "glucon" | "delegate" | "observer";
export type TheaterFactionColor = Doc<"theaterFactions">["color"];
export type TheaterMarkerCategory = Doc<"theaterMarkers">["category"];
export type TheaterInfantryVariant = "standard" | "heavy";
export type TheaterMarkerVisibility = Doc<"theaterMarkers">["visibility"];
export type TheaterMarkerConcealment = Doc<"theaterMarkers">["concealment"];
export type TheaterOrderClassification = Doc<"theaterOrders">["classification"];
export type TheaterOrderStatus = Doc<"theaterOrders">["status"];

export const theaterMapDate = "1951-11-03";
export const theaterMapDateLabel = "3 de novembro de 1951";
export const theaterMapStyleUrl =
  "https://www.openhistoricalmap.org/map-styles/main/main.json";

// [west, south, east, north]: hard limit for panning and zooming out. MapLibre keeps the
// whole viewport inside it, so it also includes the Yellow Sea and the East Sea; otherwise
// wide screens could never show the full peninsula from Jeju to the Yalu at once.
export const koreaBounds = [120.5, 32.5, 134.5, 43.5] as const;
// [west, south, east, north]: what the map shows when it opens.
export const koreaInitialBounds = [124.2, 33.1, 130.9, 42.6] as const;
export const koreaMaxZoom = 14;

export function isWithinKoreaBounds(lat: number, lng: number) {
  const [west, south, east, north] = koreaBounds;
  return lng >= west && lng <= east && lat >= south && lat <= north;
}

export const theaterRoleLabels: Record<TheaterRole, string> = {
  admin: "Administração",
  glucon: "GLUCON",
  delegate: "Delegação",
  observer: "Observador",
};

export const theaterFactionColorLabels: Record<TheaterFactionColor, string> = {
  blue: "Azul",
  red: "Vermelho",
  green: "Verde",
  yellow: "Amarelo",
  purple: "Roxo",
  orange: "Laranja",
  gray: "Cinza",
};

export const theaterFactionColorClasses: Record<TheaterFactionColor, string> = {
  blue: "bg-blue-600 text-white",
  red: "bg-red-600 text-white",
  green: "bg-emerald-600 text-white",
  yellow: "bg-yellow-400 text-zinc-950",
  purple: "bg-violet-600 text-white",
  orange: "bg-orange-500 text-white",
  gray: "bg-zinc-500 text-white",
};

export const theaterMarkerCategoryLabels: Record<TheaterMarkerCategory, string> = {
  infantry: "Infantaria",
  armor: "Blindados",
  artillery: "Artilharia",
  air: "Força aérea",
  naval: "Força naval",
  battle: "Combate",
  objective: "Objetivo",
  supply: "Suprimentos",
  intel: "Inteligência",
  event: "Acontecimento",
};

export const theaterInfantryVariantLabels: Record<TheaterInfantryVariant, string> = {
  standard: "Normal",
  heavy: "Pesada",
};

export const theaterMarkerVisibilityLabels: Record<TheaterMarkerVisibility, string> = {
  public: "Público",
  factions: "Somente facções selecionadas",
  members: "Somente participantes selecionados",
  glucon: "Somente GLUCON",
};

export const theaterMarkerConcealmentLabels: Record<TheaterMarkerConcealment, string> = {
  hidden: "Oculto para os demais participantes",
  obscured: "Não identificado para os demais participantes",
};

export const defaultObscuredMarkerLabel = "Atividade não identificada";

export const theaterOrderClassificationLabels: Record<TheaterOrderClassification, string> = {
  public: "Pública",
  faction: "Restrita",
  secret: "Sigilosa",
};

export const theaterOrderClassificationDescriptions: Record<
  TheaterOrderClassification,
  string
> = {
  public: "Todos os participantes do teatro podem ler.",
  faction: "Sua facção, as facções destinatárias e os destinatários podem ler.",
  secret: "Somente você, os destinatários escolhidos e o GLUCON podem ler.",
};

export const theaterOrderStatusLabels: Record<TheaterOrderStatus, string> = {
  sent: "Enviada",
  acknowledged: "Recebida pelo GLUCON",
  executed: "Executada",
  rejected: "Negada",
};
