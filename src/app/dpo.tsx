"use client";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { CheckCircle2, FileText, LockKeyhole, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DocumentFileUploadInput } from "@/components/admin/documents/DocumentFileUploadInput";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
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
import {
  formatDocumentFileSize,
  getUploadedDocumentFileKindLabel,
  parseUploadedDocumentFile,
} from "@/lib/document-config";

export const Route = createFileRoute("/dpo")({
  head: () => ({
    meta: [
      { title: "Envio do DPO — Simulação da ONU" },
      {
        name: "description",
        content: "Envie o Documento de Posição Oficial da sua delegação.",
      },
    ],
  }),
  component: DpoPage,
});

function DpoPage() {
  const userInfo = useQuery(api.auth.getCurrentUser);
  const submittedDpo = useQuery(api.documents.getMyPositionPaper);
  const submitPositionPaper = useMutation(api.documents.submitPositionPaper);
  const [uploadedDocument, setUploadedDocument] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLoading = userInfo === undefined || submittedDpo === undefined;
  const uploadedFile = parseUploadedDocumentFile(uploadedDocument);
  const isDelegate = userInfo?.member?.type === "delegate";

  async function handleSubmit() {
    if (!uploadedFile) {
      toast.error("Envie um PDF, DOCX ou imagem antes de confirmar o DPO.");
      return;
    }

    setIsSubmitting(true);

    try {
      const submitted = await submitPositionPaper(uploadedFile);

      if (submitted === true) {
        toast.success("DPO enviado com sucesso.");
        setUploadedDocument("");
        return;
      }

      if (submitted === false) {
        toast.error("Você já enviou seu DPO.");
        return;
      }

      toast.error("Você precisa estar vinculado como delegado para enviar o DPO.");
    } catch {
      toast.error("Não foi possível enviar o DPO.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell className="mx-auto w-full max-w-3xl">
      <PageHeader
        title="Enviar DPO"
        description="Envie seu Documento de Posição Oficial uma única vez. Após a confirmação, o arquivo ficará registrado para avaliação."
      />

      {isLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-9 w-36" />
          </CardContent>
        </Card>
      ) : !userInfo ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="size-5 text-muted-foreground" />
              Entrar para enviar
            </CardTitle>
            <CardDescription>
              Faça login com sua conta cadastrada para acessar o envio do DPO.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              render={
                <Link
                  to="/auth/$path"
                  params={{ path: "sign-in" }}
                  search={{ redirectTo: "/dpo" }}
                />
              }
            >
              Entrar
            </Button>
          </CardFooter>
        </Card>
      ) : !isDelegate ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Envio exclusivo para delegados</CardTitle>
            <CardDescription>
              Esta página está disponível apenas para membros vinculados como
              delegados.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : submittedDpo ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-primary" />
                  DPO enviado
                </CardTitle>
                <CardDescription>
                  Seu Documento de Posição Oficial já foi registrado.
                </CardDescription>
              </div>
              <Badge variant="secondary">Envio único</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <a
              href={submittedDpo.uploadthing.ufsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-start gap-3 rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FileText className="size-5" />
              </span>
              <span className="min-w-0 space-y-1">
                <span className="block break-words font-medium text-foreground">
                  {submittedDpo.uploadthing.name}
                </span>
                <span className="block text-sm text-muted-foreground">
                  {getUploadedDocumentFileKindLabel(submittedDpo.uploadthing)} -{" "}
                  {formatDocumentFileSize(submittedDpo.uploadthing.size)} MB
                </span>
              </span>
            </a>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Arquivo do DPO</CardTitle>
            <CardDescription>
              Formatos aceitos: PDF, DOCX ou imagem. Tamanho máximo: 8 MB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DocumentFileUploadInput
              value={uploadedDocument}
              onChange={setUploadedDocument}
            />
          </CardContent>
          <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Revise o arquivo antes de confirmar. O envio não poderá ser refeito.
            </p>
            <Button
              type="button"
              size="lg"
              className="sm:w-fit"
              onClick={() => void handleSubmit()}
              disabled={!uploadedFile || isSubmitting}
            >
              <Send data-icon="inline-start" />
              {isSubmitting ? "Enviando..." : "Confirmar envio"}
            </Button>
          </CardFooter>
        </Card>
      )}
    </PageShell>
  );
}
