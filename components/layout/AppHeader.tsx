import Link from "next/link";

import { AuthActions } from "@/components/layout/AuthActions";
import { PrimaryNav } from "@/components/layout/PrimaryNav";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-[rgba(255,255,255,0.04)] bg-[rgba(2,3,5,0.96)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="text-base font-medium tracking-[0.08em] text-[var(--foreground)] transition-opacity hover:opacity-80"
        >
          ONU Simulation
        </Link>

        <div className="flex items-center gap-3 sm:gap-4">
          <PrimaryNav />
          <AuthActions />
        </div>
      </div>

      <div className="border-t border-[rgba(255,255,255,0.04)] px-4 py-3 sm:hidden">
        <div className="mx-auto w-full max-w-6xl">
          <PrimaryNav mobile />
        </div>
      </div>
    </header>
  );
}
