import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, UserCog, Home, FileText, BarChart, Globe } from "lucide-react";
import type { ReactNode } from "react";

import { AdminPageTransition } from "@/components/admin/AdminPageTransition";
import { api } from "@/convex/_generated/api";
import { fetchAuthQuery } from "@/lib/auth-server";

const Links = [
  {
    href: "/admin",
    text: "Dashboard",
    icon: (
      <Home className="h-4 w-4 transition-transform group-hover:scale-110" />
    ),
  },
  {
    href: "/admin/members",
    text: "Membros",
    icon: (
      <Users className="h-4 w-4 transition-transform group-hover:scale-110" />
    ),
  },
  {
    href: "/admin/users",
    text: "Usuários",
    icon: (
      <UserCog className="h-4 w-4 transition-transform group-hover:scale-110" />
    ),
  },
  {
    href: "/admin/committees",
    text: "Comitês",
    icon: (
      <Globe className="h-4 w-4 transition-transform group-hover:scale-110" />
    ),
  },
  {
    href: "/admin/documents",
    text: "Documentos",
    icon: (
      <FileText className="h-4 w-4 transition-transform group-hover:scale-110" />
    ),
  },
  {
    href: "/admin/reports",
    text: "Relatórios",
    icon: (
      <BarChart className="h-4 w-4 transition-transform group-hover:scale-110" />
    ),
  },
] as {
  text: string;
  href: string;
  icon: ReactNode;
}[];

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userInfo = await fetchAuthQuery(api.auth.getCurrentUser, {});

  if (userInfo?.member?.type !== "admin") {
    redirect("/");
  }

  return (
    <div className="flex w-full flex-1">
      <aside className="w-64 flex-shrink-0 border-r border-border/50 bg-muted/40 min-h-full">
        <nav className="flex h-full flex-col gap-2 p-4">
          <div className="text-sm font-medium text-muted-foreground mb-4 px-2">
            Administração
          </div>

          {Links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all duration-200 hover:bg-accent/80 hover:text-accent-foreground"
            >
              {l.icon}
              {l.text}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1">
        <div className="p-8">
          <AdminPageTransition>{children}</AdminPageTransition>
        </div>
      </main>
    </div>
  );
}
