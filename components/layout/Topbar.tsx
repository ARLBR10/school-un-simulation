"use client";
import {
  AuthLoading,
  SignedIn,
  SignedOut,
  UserButton,
} from "@daveyplate/better-auth-ui";
import { useQuery } from "convex/react";
import { Menu, ShieldUser } from "lucide-react";
import Link from "next/link";
import type { ComponentProps } from "react";

import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

function AuthButtonSkeleton() {
  return (
    <div className="h-10 w-24 animate-pulse rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)]" />
  );
}

export function Topbar({ className, ...props }: ComponentProps<"header">) {
  const userInfo = useQuery(api.auth.getCurrentUser);
  const navigationLinks = [
    { href: "/committees", label: "Comitês" },
    { href: "/news", label: "Noticias" },
    { href: "/rules", label: "Regras" },
  ];
  const userButtonLinks = userInfo?.member?.type === "admin"
    ? [
        {
          href: "/admin",
          label: "Painel Admin",
          icon: <ShieldUser />,
        },
      ]
    : [];

  return (
    <header
      data-slot="topbar"
      className={cn(
        "sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur supports-[backdrop-filter]:bg-black/20",
        className,
      )}
      {...props}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link href="/" className="min-w-0 flex items-center">
          <span className="truncate text-sm font-bold tracking-tight text-white sm:text-xl">
            Simulação da ONU
          </span>
        </Link>

        <div className="hidden flex-1 items-center justify-end space-x-6 text-sm font-medium text-white/70 md:flex">
          <nav className="flex items-center space-x-6">
            {navigationLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <AuthLoading>
            <AuthButtonSkeleton />
          </AuthLoading>
          <SignedIn>
            <UserButton
              variant="outline"
              className="!h-10 rounded-xl border-[rgba(255,255,255,0.12)] !bg-[linear-gradient(135deg,rgba(216,221,231,0.2),rgba(216,221,231,0.06))] px-3 font-semibold text-[var(--foreground)] shadow-[0_12px_30px_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.24)] hover:!bg-[linear-gradient(135deg,rgba(216,221,231,0.28),rgba(216,221,231,0.1))]"
              additionalLinks={userButtonLinks}
              classNames={{
                trigger: {
                  avatar: {
                    fallback:
                      "bg-[rgba(216,221,231,0.25)] text-[var(--foreground)]",
                  },
                },
              }}
            />
          </SignedIn>
          <SignedOut>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="group h-10 rounded-xl border-[rgba(255,255,255,0.12)] bg-[linear-gradient(135deg,rgba(216,221,231,0.2),rgba(216,221,231,0.06))] px-4 font-semibold text-[var(--foreground)] shadow-[0_12px_30px_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.24)] hover:bg-[linear-gradient(135deg,rgba(216,221,231,0.28),rgba(216,221,231,0.1))]"
            >
              <Link href="/auth/sign-in">
                Entrar
                <span
                  aria-hidden="true"
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  {"->"}
                </span>
              </Link>
            </Button>
          </SignedOut>
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <Menu className="size-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[85vw] max-w-sm border-white/10 bg-black/95 p-0 text-white"
            >
              <SheetTitle className="sr-only">Menu principal</SheetTitle>
              <SheetDescription className="sr-only">
                Navegue pelas seções principais e acesse sua conta.
              </SheetDescription>
              <div className="flex h-full flex-col">
                <div className="border-b border-white/10 px-6 py-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
                    Navegação
                  </p>
                  <p className="mt-1 text-base font-semibold text-white">
                    Simulação da ONU
                  </p>
                </div>

                <nav className="flex flex-col px-3 py-4 text-base text-white/80">
                  {navigationLinks.map((link) => (
                    <SheetClose key={link.href} asChild>
                      <Link
                        href={link.href}
                        className="rounded-lg px-3 py-2 transition-colors hover:bg-white/10 hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </SheetClose>
                  ))}
                </nav>

                <div className="mt-auto border-t border-white/10 px-4 py-5">
                  <AuthLoading>
                    <AuthButtonSkeleton />
                  </AuthLoading>
                  <SignedIn>
                    <UserButton
                      variant="outline"
                      className="!h-10 rounded-xl border-[rgba(255,255,255,0.12)] !bg-[linear-gradient(135deg,rgba(216,221,231,0.2),rgba(216,221,231,0.06))] px-3 font-semibold text-[var(--foreground)] shadow-[0_12px_30px_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.24)] hover:!bg-[linear-gradient(135deg,rgba(216,221,231,0.28),rgba(216,221,231,0.1))]"
                      additionalLinks={userButtonLinks}
                      classNames={{
                        trigger: {
                          avatar: {
                            fallback:
                              "bg-[rgba(216,221,231,0.25)] text-[var(--foreground)]",
                          },
                        },
                      }}
                    />
                  </SignedIn>
                  <SignedOut>
                    <SheetClose asChild>
                      <Link
                        href="/auth/sign-in"
                        className="group mt-2 inline-flex h-10 w-full items-center justify-center rounded-xl border border-[rgba(255,255,255,0.12)] bg-[linear-gradient(135deg,rgba(216,221,231,0.2),rgba(216,221,231,0.06))] px-4 text-[0.8rem] font-semibold text-[var(--foreground)] shadow-[0_12px_30px_rgba(0,0,0,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[rgba(255,255,255,0.24)] hover:bg-[linear-gradient(135deg,rgba(216,221,231,0.28),rgba(216,221,231,0.1))]"
                      >
                        Entrar
                        <span
                          aria-hidden="true"
                          className="transition-transform duration-200 group-hover:translate-x-0.5"
                        >
                          {"->"}
                        </span>
                      </Link>
                    </SheetClose>
                  </SignedOut>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
