"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { ShieldAlert } from "lucide-react";

import { PageShell } from "@/components/layout/PageShell";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <PageShell className="mx-auto w-full max-w-3xl justify-center">
        <Card
          className={cn(
            "gap-6 py-6 translate-y-4 opacity-0 transition-all duration-700 ease-out sm:py-8",
            mounted && "translate-y-0 opacity-100",
          )}
        >
        <CardHeader className="gap-4 px-6 text-center justify-items-center sm:px-8">
          <div className="flex size-12 items-center justify-center rounded-full border bg-muted text-muted-foreground">
            <ShieldAlert />
          </div>
          <CardTitle className="text-balance text-3xl tracking-tight sm:text-4xl">
            Você ainda não tem autorização
          </CardTitle>
          <CardDescription className="max-w-xl text-balance leading-6">
            Entre em contato com a organização do evento para solicitar a
            liberação da sua conta e o acesso a esta área.
          </CardDescription>
        </CardHeader>
        <p className="px-6 text-center text-sm text-muted-foreground sm:px-8">
          Acesso restrito a membros vinculados à simulação.
        </p>
      </Card>
    </PageShell>
  );
}
