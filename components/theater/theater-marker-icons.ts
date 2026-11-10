import {
  Crosshair,
  Eye,
  Flag,
  Info,
  Package,
  Plane,
  Shield,
  Ship,
  Swords,
  Truck,
  type LucideIcon,
} from "lucide-react";

import type { TheaterMarkerCategory } from "@/lib/theater";

export const theaterMarkerCategoryIcons: Record<TheaterMarkerCategory, LucideIcon> = {
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
