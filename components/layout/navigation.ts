export type PrimaryNavItem = {
  id: string;
  href: string;
  label: string;
};

export const primaryNavItems: PrimaryNavItem[] = [
  { id: "home", href: "/", label: "Início" },
  { id: "committees", href: "#", label: "Comitês" },
  { id: "agenda", href: "#", label: "Agenda" },
];
