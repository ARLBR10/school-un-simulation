"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";

export function LegalBackButton() {
  const router = useRouter();

  return (
    <Button type="button" variant="outline" onClick={() => router.history.back()}>
      <ArrowLeft aria-hidden="true" data-icon="inline-start" />
      Voltar
    </Button>
  );
}
