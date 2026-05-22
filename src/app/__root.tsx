import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  redirect,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";

import appCss from "./globals.css?url";

import type { ReactNode } from "react";

import { ClientRoot } from "@/components/layout/ClientRoot";
import { NotFound } from "@/src/app/-not-found";
import { getToken } from "@/src/server/auth";
import { cn } from "@/lib/utils";

const isDev = import.meta.env.DEV;

const getAuthToken = createServerFn({ method: "GET" }).handler(async () => {
  return await getToken();
});

function isPublicRoute(pathname: string) {
  return (
    pathname === "/terms" ||
    pathname === "/privacy" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/")
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      { title: "Simulação da ONU" },
      {
        name: "description",
        content: "Painel para simulação das Nações Unidas",
      },
      {
        name: "apple-mobile-web-app-title",
        content: "Simulação da ONU",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Geist+Mono:wght@100..900&family=Inter:wght@100..900&display=swap",
      },
      {
        rel: "icon",
        href: "/favicon-96x96.png",
        type: "image/png",
        sizes: "96x96",
      },
      {
        rel: "icon",
        href: "/favicon.svg",
        type: "image/svg+xml",
      },
      {
        rel: "shortcut icon",
        href: "/favicon.ico",
      },
      {
        rel: "apple-touch-icon",
        href: "/apple-touch-icon.png",
        sizes: "180x180"
      },
      {
        rel: "manifest",
        href: "/site.webmanifest"
      },
    ],
  }),
  beforeLoad: async ({ location }) => {
    if (isPublicRoute(location.pathname)) {
      return {
        token: null,
      };
    }

    const token = await getAuthToken().catch(() => null);

    if (!token) {
      throw redirect({
        to: "/auth/$path",
        params: { path: "sign-in" },
        search: { redirectTo: location.pathname },
      });
    }

    return {
      token,
    };
  },
  notFoundComponent: NotFound,
  component: RootComponent,
});

function RootComponent() {
  const { token } = Route.useRouteContext();

  return (
    <RootDocument>
      <ClientRoot initialToken={token ?? null}>
        <Outlet />
      </ClientRoot>
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={cn("h-full antialiased dark font-sans")}
      suppressHydrationWarning
    >
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-full flex-col bg-black text-white">
        {children}

        {isDev ? (
          <TanStackDevtools
            config={{
              position: "bottom-right",
            }}
            plugins={[
              {
                name: "TanStack Router",
                render: <TanStackRouterDevtoolsPanel />,
              },
            ]}
          />
        ) : null}

        <Scripts />
      </body>
    </html>
  );
}
