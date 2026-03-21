import { AuthLoading, SignedIn, SignedOut, UserButton } from "@daveyplate/better-auth-ui";
import Link from "next/link";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function AuthButtonSkeleton() {
  return (
    <div className="h-10 w-24 animate-pulse rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)]" />
  );
}

export function Topbar({ className, ...props }: ComponentProps<"header">) {
  return (
    <header
      data-slot="topbar"
      className={cn(
        "sticky top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur supports-[backdrop-filter]:bg-black/20",
        className,
      )}
      {...props}
    >
      <div className="container flex h-16 items-center justify-between px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="flex gap-6 md:gap-10">
          <Link href="/" className="flex items-center space-x-2">
            <span className="inline-block font-bold text-xl tracking-tight text-white">
              Simulação da ONU
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-6 text-sm font-medium text-white/70">
          <nav className="flex items-center space-x-6">
            <Link
              href="/comites"
              className="transition-colors hover:text-white"
            >
              Comitês
            </Link>
            <Link
              href="/delegacoes"
              className="transition-colors hover:text-white"
            >
              Delegações
            </Link>
            <Link href="/sobre" className="transition-colors hover:text-white">
              Sobre
            </Link>
          </nav>
          <AuthLoading>
            <AuthButtonSkeleton />
          </AuthLoading>
          <SignedIn>
            <UserButton />
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
      </div>
    </header>
  );
}
