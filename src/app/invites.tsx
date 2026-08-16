"use client";

import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, Link2, LockKeyhole, TimerOff, UserCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";

export const Route = createFileRoute("/invites")({
  validateSearch: (search) => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({
    meta: [
      { title: "Vincular membro — Simulação da ONU" },
      {
        name: "description",
        content: "Vincule sua conta autenticada ao cadastro de membro.",
      },
    ],
  }),
  component: InvitesPage,
});

function formatExpiresAt(value: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function InvitesPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const userInfo = useQuery(api.auth.getCurrentUser);
  const invitePreview = useQuery(
    api.memberInvites.preview,
    token ? { token } : "skip",
  );
  const acceptInvite = useMutation(api.memberInvites.accept);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLoading = userInfo === undefined || (token && invitePreview === undefined);

  async function handleAccept() {
    if (!token) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await acceptInvite({ token });

      if (result === "accepted") {
        toast.success("Conta vinculada com sucesso.");
        await navigate({ to: "/", replace: true });
        return;
      }

      if (result === "expired") {
        toast.error("Este convite expirou.");
        return;
      }

      if (result === "already_assigned") {
        toast.error("Esta conta ou este membro já possui vínculo.");
        return;
      }

      toast.error("Convite inválido.");
    } catch {
      toast.error("Não foi possível vincular sua conta.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell className="mx-auto w-full max-w-2xl">
      <PageHeader
        title="Vincular conta ao membro"
        description="Confirme o convite enviado pela administração para conectar sua conta ao cadastro correto."
      />

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      ) : !userInfo ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="size-5 text-muted-foreground" />
              Entre para continuar
            </CardTitle>
            <CardDescription>
              Você precisa estar autenticado para aceitar um convite de vínculo.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              render={
                <Link
                  to="/auth/$path"
                  params={{ path: "sign-in" }}
                  search={{ redirectTo: token ? `/invites?token=${token}` : "/invites" }}
                />
              }
            >
              Entrar
            </Button>
          </CardFooter>
        </Card>
      ) : userInfo.member ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-primary" />
              Conta já vinculada
            </CardTitle>
            <CardDescription>
              Sua conta já está vinculada ao cadastro de {userInfo.member.name}.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : !token || !invitePreview ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="size-5 text-muted-foreground" />
              Convite inválido
            </CardTitle>
            <CardDescription>
              Peça à administração um link de convite válido para vincular sua conta.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : invitePreview.status === "expired" ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TimerOff className="size-5 text-destructive" />
              Convite expirado
            </CardTitle>
            <CardDescription>
              Este convite expirou em {formatExpiresAt(invitePreview.invite.expiresAt)}.
              Peça à administração para excluir este convite e gerar um novo.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : invitePreview.status === "assigned" ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Membro já vinculado</CardTitle>
            <CardDescription>
              Este cadastro de membro já está vinculado a outra conta.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="size-5 text-primary" />
              Confirmar vínculo
            </CardTitle>
            <CardDescription>
              Este convite vinculará sua conta ao cadastro abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border bg-muted/20 p-4">
              <p className="text-sm font-semibold">{invitePreview.member.name}</p>
              <p className="text-sm text-muted-foreground">
                Convite válido até {formatExpiresAt(invitePreview.invite.expiresAt)}.
              </p>
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button disabled={isSubmitting} onClick={() => void handleAccept()}>
              Vincular minha conta
            </Button>
          </CardFooter>
        </Card>
      )}
    </PageShell>
  );
}
