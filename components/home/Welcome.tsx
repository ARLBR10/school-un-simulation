"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function Welcome() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-1 flex-col items-center justify-center relative min-h-[calc(100vh-8rem)]">
      {/* Dynamic glow effect */}
      <div 
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] opacity-0 transition-opacity duration-1000 ease-in-out bg-white/10 pointer-events-none",
          mounted && "opacity-100"
        )}
      />
      
      <div 
        className={cn(
          "z-10 flex flex-col items-center text-center px-4 translate-y-8 opacity-0 transition-all duration-[1500ms] ease-out",
          mounted && "translate-y-0 opacity-100"
        )}
      >
        <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 mb-6 pb-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
          Bem-vindo à Simulação
        </h1>
        <p className="text-xl sm:text-2xl text-white/60 max-w-[600px] leading-relaxed">
          Prepare-se para debater, negociar e resolver os maiores desafios globais.
        </p>
      </div>
    </div>
  );
}
