import {
  Crosshair,
  Eye,
  Flag,
  Info,
  Package,
  Plane,
  Shield,
  ShieldPlus,
  Ship,
  Swords,
  Truck,
  type LucideIcon,
} from "lucide-react";

import type { TheaterInfantryVariant, TheaterMarkerCategory } from "@/lib/theater";

const theaterMarkerCategoryIcons: Record<TheaterMarkerCategory, LucideIcon> = {
  infantry: Shield,
  armor: Truck,
  artillery: Crosshair,
  air: Plane,
  naval: Ship,
  battle: Swords,
  objective: Flag,
  supply: Package,
  intel: Eye,
  event: Info,
};

export function getTheaterMarkerIcon(
  category: TheaterMarkerCategory,
  infantryVariant?: TheaterInfantryVariant | null,
): LucideIcon {
  return category === "infantry" && infantryVariant === "heavy"
    ? ShieldPlus
    : theaterMarkerCategoryIcons[category];
}
