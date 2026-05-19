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
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Globe,
  Landmark,
  LogIn,
  Newspaper,
  NotebookPen,
  UserCog,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, type CSSProperties, type ReactNode } from "react";

import { api } from "@/convex/_generated/api";
import {
  getAllowedMemberTypesForGraderType,
  type GradingMemberType,
} from "@/lib/grading-categories";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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

type AppBreadcrumbItem = {
  href?: string;
  label: string;
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
  { href: "/admin/grades", label: "Notas", icon: ClipboardCheck },
  { href: "/admin/attendance", label: "Presenças", icon: UserCheck },
  { href: "/admin/documents", label: "Documentos", icon: FileText },
];

const pressNavigationLinks: NavigationItem[] = [
  { href: "/press/news", label: "Notícias", icon: Newspaper },
];

const gradingNavigationLinks: NavigationItem[] = [
  { href: "/grading", label: "Notas", icon: NotebookPen },
];

const operationsNavigationLinks: NavigationItem[] = [
  ...gradingNavigationLinks,
  { href: "/attendance", label: "Presenças", icon: ClipboardList },
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
          Programado pelo Meg (e IA!)
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
  const isPress = userInfo?.member?.type === "press" || isAdmin;
  const canManageAttendance =
    isAdmin ||
    userInfo?.member?.type === "logistics" ||
    userInfo?.member?.type === "clerk";
  const canManageGrades = userInfo?.member
    ? getAllowedMemberTypesForGraderType(
        userInfo.member.type as GradingMemberType,
        isAdmin,
      ).length > 0
    : false;

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

        {isUserInfoLoading ? <AppSidebarAdminSkeleton /> : null}

        {!isUserInfoLoading && isAdmin ? (
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

        {!isUserInfoLoading && (isPress || isAdmin) ? (
          <SidebarGroup>
            <SidebarGroupLabel className="h-9 text-sm font-semibold">
              Imprensa
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {pressNavigationLinks.map((item) => (
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

        {!isUserInfoLoading && (canManageGrades || canManageAttendance) ? (
          <SidebarGroup>
            <SidebarGroupLabel className="h-9 text-sm font-semibold">
              Operação
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {operationsNavigationLinks
                  .filter((item) => {
                    if (item.href === "/grading") {
                      return canManageGrades;
                    }

                    if (item.href === "/attendance") {
                      return canManageAttendance;
                    }

                    return true;
                  })
                  .map((item) => (
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

function getPageBreadcrumbItems(pathname: string): AppBreadcrumbItem[] {
  if (pathname === "/") {
    return [{ label: "Início" }];
  }

  if (pathname === "/committees") {
    return [{ label: "Comitês" }];
  }

  if (pathname.startsWith("/committees/")) {
    return [
      { href: "/committees", label: "Comitês" },
      { label: "Detalhes do comitê" },
    ];
  }

  if (pathname === "/admin") {
    return [{ label: "Painel administrativo" }];
  }

  if (pathname.startsWith("/admin/members")) {
    return [
      { href: "/admin", label: "Administração" },
      { label: "Membros" },
    ];
  }

  if (pathname.startsWith("/admin/users")) {
    return [
      { href: "/admin", label: "Administração" },
      { label: "Usuários" },
    ];
  }

  if (pathname.startsWith("/admin/committees")) {
    return [
      { href: "/admin", label: "Administração" },
      { label: "Comitês" },
    ];
  }

  if (pathname.startsWith("/admin/news")) {
    return [
      { href: "/admin", label: "Administração" },
      { label: "Notícias" },
    ];
  }

  if (pathname.startsWith("/admin/grades")) {
    return [
      { href: "/admin", label: "Administração" },
      { label: "Notas" },
    ];
  }

  if (pathname.startsWith("/admin/attendance")) {
    return [
      { href: "/admin", label: "Administração" },
      { label: "Presenças" },
    ];
  }

  if (pathname.startsWith("/admin/documents")) {
    return [
      { href: "/admin", label: "Administração" },
      { label: "Documentos" },
    ];
  }

  if (pathname.startsWith("/admin/reports")) {
    return [
      { href: "/admin", label: "Administração" },
      { label: "Relatórios" },
    ];
  }

  if (pathname === "/news") {
    return [{ label: "Notícias" }];
  }

  if (pathname === "/terms") {
    return [{ label: "Termos de Serviço" }];
  }

  if (pathname === "/privacy") {
    return [{ label: "Política de Privacidade" }];
  }

  if (pathname.startsWith("/news/")) {
    return [
      { href: "/news", label: "Notícias" },
      { label: "Notícia" },
    ];
  }

  if (pathname.startsWith("/press/news")) {
    return [{ label: "Notícias da imprensa" }];
  }

  if (pathname.startsWith("/grading")) {
    return [{ label: "Lançamentos de notas" }];
  }

  if (pathname.startsWith("/attendance")) {
    return [{ label: "Presenças" }];
  }

  return [{ label: "Simulação da ONU" }];
}

function SiteHeader() {
  const pathname = usePathname();
  const breadcrumbItems = getPageBreadcrumbItems(pathname);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b bg-background transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb className="min-w-0">
          <BreadcrumbList className="min-w-0 flex-nowrap">
            {breadcrumbItems.map((item, index) => {
              const isLastItem = index === breadcrumbItems.length - 1;

              return (
                <Fragment key={`${item.href ?? item.label}-${index}`}>
                  {index > 0 ? (
                    <BreadcrumbSeparator className="hidden sm:block" />
                  ) : null}
                  <BreadcrumbItem
                    className={
                      isLastItem
                        ? "min-w-0"
                        : "hidden min-w-0 sm:inline-flex"
                    }
                  >
                    {item.href && !isLastItem ? (
                      <BreadcrumbLink asChild className="block truncate">
                        <Link href={item.href}>{item.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage className="block truncate text-sm font-medium">
                        {item.label}
                      </BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </Fragment>
              );
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPath = pathname.startsWith("/auth");
  const isStandalonePath =
    isAuthPath || pathname.startsWith("/error") || pathname === ("/terms") || pathname === ("/privacy");

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
