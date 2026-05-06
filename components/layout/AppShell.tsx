"use client";

import { SiGithub } from "@icons-pack/react-simple-icons";
import {
  AuthLoading,
  SignedIn,
  SignedOut,
  UserButton,
} from "@daveyplate/better-auth-ui";
import { useQuery } from "convex/react";
import {
  BarChart3,
  BookOpen,
  FileText,
  Globe,
  Home,
  Landmark,
  LogIn,
  Newspaper,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";

import { api } from "@/convex/_generated/api";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TooltipProvider } from "@/components/ui/tooltip";

type NavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const publicNavigationLinks: NavigationItem[] = [
  { href: "/committees", label: "Comitês", icon: Globe },
  { href: "/news", label: "Notícias", icon: Newspaper },
  { href: "/rules", label: "Regras", icon: BookOpen },
];

const adminNavigationLinks: NavigationItem[] = [
  { href: "/admin/members", label: "Membros", icon: Users },
  { href: "/admin/users", label: "Usuários", icon: UserCog },
  { href: "/admin/committees", label: "Comitês", icon: Globe },
  { href: "/admin/news", label: "Notícias", icon: Newspaper },
  { href: "/admin/documents", label: "Documentos", icon: FileText },
  { href: "/admin/reports", label: "Relatórios", icon: BarChart3 },
];

function isActivePath(pathname: string, item: NavigationItem) {
  if (item.exact) {
    return pathname === item.href;
  }

  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function AppSidebarLink({
  item,
  isActive,
}: {
  item: NavigationItem;
  isActive: boolean;
}) {
  const { isMobile, setOpenMobile } = useSidebar();
  const Icon = item.icon;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        className="h-9 text-sm"
      >
        <Link
          href={item.href}
          onClick={() => {
            if (isMobile) {
              setOpenMobile(false);
            }
          }}
        >
          <Icon />
          <span>{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function AppSidebarFooter() {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarFooter>
      <SidebarMenu>
        <SidebarMenuItem>
          <AuthLoading>
            <SidebarMenuSkeleton showIcon />
          </AuthLoading>
          <SignedIn>
            <UserButton
              variant="ghost"
              size="lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
              className="!h-12 w-full min-w-0 justify-start rounded-md !p-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:[&>svg:last-child]:hidden"
              classNames={{
                base: "w-full min-w-0",
                trigger: {
                  base: "w-full min-w-0 overflow-hidden",
                  avatar: {
                    base: "size-8 shrink-0 rounded-lg",
                    fallback: "rounded-lg bg-sidebar-primary text-sidebar-primary-foreground",
                  },
                  user: {
                    base: "min-w-0 flex-1 group-data-[collapsible=icon]:hidden",
                    content: "grid min-w-0 flex-1 text-left text-sm leading-tight",
                    title: "truncate font-medium",
                    subtitle: "truncate text-xs text-sidebar-foreground/70",
                  },
                },
                content: {
                  base: "min-w-56 rounded-lg",
                },
              }}
            />
          </SignedIn>
          <SignedOut>
            <SidebarMenuButton asChild tooltip="Entrar">
              <Link
                href="/auth/sign-in"
                onClick={() => {
                  if (isMobile) {
                    setOpenMobile(false);
                  }
                }}
              >
                <LogIn />
                <span>Entrar</span>
              </Link>
            </SidebarMenuButton>
          </SignedOut>
        </SidebarMenuItem>
      </SidebarMenu>
      <div className="flex items-center justify-between border-t border-sidebar-border px-2 pt-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <span className="truncate text-xs text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">
          Programado por Meg (e IA!)
        </span>
        <Link
          href="https://github.com/ARLBR10/school-un-simulation"
          target="_blank"
          rel="noreferrer"
          className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <SiGithub className="size-3.5" />
          <span className="sr-only">GitHub</span>
        </Link>
      </div>
    </SidebarFooter>
  );
}

function AppSidebarAdminSkeleton() {
  return (
    <SidebarGroup aria-label="Carregando navegação administrativa">
      <SidebarGroupLabel className="h-9 text-sm font-semibold">
        <Skeleton className="h-4 w-32" />
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {adminNavigationLinks.map((item) => (
            <SidebarMenuItem key={`admin-skeleton-${item.href}`}>
              <SidebarMenuSkeleton showIcon className="h-9" />
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function AppSidebar() {
  const pathname = usePathname();
  const userInfo = useQuery(api.auth.getCurrentUser);
  const isUserInfoLoading = userInfo === undefined;
  const isAdmin = userInfo?.member?.type === "admin";

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg" tooltip="Início">
              <Link href="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Landmark className="size-4" />
                </div>
                <span className="truncate font-medium">
                  Simulação da ONU
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="h-9 text-sm font-semibold">
            Páginas públicas
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {publicNavigationLinks.map((item) => (
                <AppSidebarLink
                  key={item.href}
                  item={item}
                  isActive={isActivePath(pathname, item)}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isUserInfoLoading ? (
          <AppSidebarAdminSkeleton />
        ) : isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel className="h-9 text-sm font-semibold">
              Administração
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminNavigationLinks.map((item) => (
                  <AppSidebarLink
                    key={item.href}
                    item={item}
                    isActive={isActivePath(pathname, item)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <AppSidebarFooter />
      <SidebarRail />
    </Sidebar>
  );
}

function getPageTitle(pathname: string) {
  if (pathname === "/") {
    return "Início";
  }

  if (pathname === "/committees") {
    return "Comitês";
  }

  if (pathname.startsWith("/committees/")) {
    return "Detalhes do comitê";
  }

  if (pathname === "/admin") {
    return "Painel administrativo";
  }

  if (pathname.startsWith("/admin/members")) {
    return "Membros";
  }

  if (pathname.startsWith("/admin/users")) {
    return "Usuários";
  }

  if (pathname === "/news") {
    return "Notícias";
  }

  if (pathname.startsWith("/news/")) {
    return "Notícia";
  }

  if (pathname.startsWith("/admin/committees")) {
    return "Comitês";
  }

  if (pathname.startsWith("/admin/documents")) {
    return "Documentos";
  }

  if (pathname.startsWith("/admin/reports")) {
    return "Relatórios";
  }

  return "Simulação da ONU";
}

function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="truncate text-sm font-medium">
          {getPageTitle(pathname)}
        </h1>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPath = pathname.startsWith("/auth");
  const isStandalonePath =
    isAuthPath || pathname.startsWith("/error");

  if (isStandalonePath) {
    return (
      <main
        className={
          isAuthPath
            ? "relative flex flex-1 flex-col"
            : "relative flex flex-1 flex-col bg-background text-foreground"
        }
      >
        <div className="flex flex-1 flex-col">{children}</div>
      </main>
    );
  }

  return (
    <TooltipProvider>
      <SidebarProvider
        style={{
          "--sidebar-width": "18rem",
          "--header-height": "3rem",
        } as CSSProperties}
      >
        <AppSidebar />
        <SidebarInset className="min-h-screen">
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
