"use client";

import { type ComponentProps, useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export function Welcome({ className, ...props }: ComponentProps<"section">) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section
      data-slot="welcome"
      className={cn(
        "relative flex min-h-[calc(100vh-8rem)] flex-1 flex-col items-center justify-center",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "pointer-events-none absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 opacity-0 blur-[100px] transition-opacity duration-1000 ease-in-out",
          mounted && "opacity-100",
        )}
      />

      <div
        className={cn(
          "z-10 flex translate-y-8 flex-col items-center px-4 text-center opacity-0 transition-all duration-[1500ms] ease-out",
          mounted && "translate-y-0 opacity-100",
        )}
      >
        <h1 className="mb-6 bg-gradient-to-b from-white to-white/60 bg-clip-text pb-2 text-5xl font-bold tracking-tighter text-transparent drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] sm:text-7xl lg:text-8xl">
          Bem-vindo à Simulação
        </h1>
        <p className="max-w-[600px] text-xl leading-relaxed text-white/60 sm:text-2xl">
          Prepare-se para debater, negociar e resolver os maiores desafios globais.
        </p>
      </div>
    </section>
  );
}
