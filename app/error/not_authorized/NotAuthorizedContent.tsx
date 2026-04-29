"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { ShieldAlert } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

export function NotAuthorizedContent() {
  const [mounted, setMounted] = useState(false);
  const userInfo = useQuery(api.auth.getCurrentUser);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (userInfo?.member) {
      router.replace("/");
    }
  }, [router, userInfo?.member]);

  return (
    <section className="relative flex min-h-[calc(100vh-8rem)] flex-1 flex-col items-center justify-center px-4 text-center">
      <div
        className={cn(
          "pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 opacity-0 blur-[100px] transition-opacity duration-1000 ease-in-out",
          mounted && "opacity-100",
        )}
      />

      <div
        className={cn(
          "z-10 flex translate-y-8 flex-col items-center gap-6 opacity-0 transition-all duration-[1500ms] ease-out",
          mounted && "translate-y-0 opacity-100",
        )}
      >
        <div className="flex size-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70">
          <ShieldAlert />
        </div>

        <div className="flex flex-col items-center gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/45">
            Acesso restrito
          </p>
          <h1 className="max-w-4xl bg-gradient-to-b from-white to-white/60 bg-clip-text pb-2 text-5xl font-bold tracking-tighter text-transparent drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] sm:text-7xl">
            Você ainda não tem autorização
          </h1>
          <p className="max-w-[560px] text-sm leading-7 text-white/45 sm:text-base">
            Entre em contato com a organização do evento para solicitar a
            liberação da sua conta e o acesso a esta área.
          </p>
        </div>
      </div>
    </section>
  );
}
