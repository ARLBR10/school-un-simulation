"use client";

import { type ComponentProps, useEffect, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        "flex min-h-[calc(100svh-9rem)] flex-1 items-center",
        className,
      )}
      {...props}
    >
      <Card
        className={cn(
          "w-full translate-y-4 opacity-0 transition-all duration-700 ease-out",
          mounted && "translate-y-0 opacity-100",
        )}
      >
        <CardHeader className="gap-4 p-6 sm:p-8 lg:p-10">
          <Badge variant="outline" className="w-fit">
            Simulação da ONU
          </Badge>
          <div className="flex max-w-4xl flex-col gap-3">
            <CardTitle className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Bem-vindo à Simulação
            </CardTitle>
            <CardDescription className="max-w-2xl text-base leading-7 sm:text-lg">
              Prepare-se para debater, negociar e resolver os maiores desafios
              globais em uma experiência organizada para delegados e equipe.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild>
              <Link href="/committees">Ver comitês</Link>
            </Button>
          </div>
        </CardHeader>
        <div className="grid gap-4 border-t p-6 sm:grid-cols-2 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Comitês</span>
            <span className="text-sm text-muted-foreground">
              Temas, tópicos e delegações em sessão.
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium">Membros</span>
            <span className="text-sm text-muted-foreground">
              Participantes vinculados aos seus papéis.
            </span>
          </div>
        </div>
      </Card>
    </section>
  );
}
