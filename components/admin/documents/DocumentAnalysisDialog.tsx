"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import {
  FileText,
  LoaderCircle,
  RotateCcw,
  TriangleAlert,
} from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";

import { BooleanCell } from "@/components/admin/DynamicTableFields";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  formatDocumentMarkdownPage,
  formatDocumentScore,
  getDocumentAnalysisMaxScore,
  getDocumentScoreEntries,
  hasDocumentAnalysisConfig,
  hasCompletedDocumentAnalysis,
  isDocumentAnalysisProcessing,
} from "@/lib/document-config";

type DocumentAiAnalysis = NonNullable<Doc<"docs">["aiAnalysis"]>;

export function DocumentAnalysisDialog({
  document,
  fileName,
  type,
  showRerunAction = true,
}: {
  document: Doc<"docs"> | null;
  fileName: string;
  type: string;
  showRerunAction?: boolean;
}) {
  const rerunAnalysis = useMutation(api.documents.rerunAnalysis);
  const [isRerunning, setIsRerunning] = useState(false);
  const aiAnalysis = document?.aiAnalysis;
  const isProcessing = isDocumentAnalysisProcessing(aiAnalysis);
  const hasFailure = Boolean(aiAnalysis?.job_status?.llmReviewFailed);
  const isCompleted = hasCompletedDocumentAnalysis(aiAnalysis);
  const canRunAnalysis = Boolean(
    document && hasDocumentAnalysisConfig(document.type),
  );
  const hasExistingAnalysis = Boolean(aiAnalysis);

  async function handleRerunAnalysis() {
    if (!document) {
      return;
    }

    setIsRerunning(true);

    try {
      const rerun = await rerunAnalysis({ id: document._id });

      if (rerun === true) {
        toast.success("Análise reiniciada.");
        return;
      }

      toast.error("Não foi possível reiniciar a análise.");
    } catch {
      toast.error("Não foi possível reiniciar a análise.");
    } finally {
      setIsRerunning(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {isProcessing ? (
            <LoaderCircle data-icon="inline-start" className="animate-spin" />
          ) : (
            <FileText data-icon="inline-start" />
          )}
          {isProcessing ? "Processando" : "Detalhes"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da análise</DialogTitle>
          <DialogDescription>
            Resultado da análise automática de {fileName}.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[min(65vh,36rem)] pr-3">
          {isProcessing ? (
            <ProcessingAnalysisView aiAnalysis={aiAnalysis} />
          ) : hasFailure ? (
            <FailedAnalysisView />
          ) : isCompleted && aiAnalysis ? (
            <CompletedAnalysisView aiAnalysis={aiAnalysis} type={type} />
          ) : (
            <UnavailableAnalysisView />
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 sm:justify-between">
          <p className="text-xs text-muted-foreground sm:self-center">
            Usa serviços pagos de OCR e IA.
          </p>
          {showRerunAction ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canRunAnalysis || isProcessing || isRerunning}
                >
                  {isRerunning ? (
                    <LoaderCircle data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <RotateCcw data-icon="inline-start" />
                  )}
                  {hasExistingAnalysis ? "Reprocessar" : "Executar análise"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {hasExistingAnalysis
                      ? "Reprocessar análise?"
                      : "Executar análise?"}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta operação usa serviços pagos ou limitados de OCR e IA.
                    {hasExistingAnalysis
                      ? " A análise existente será substituída."
                      : " Um novo processamento será iniciado."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={() => void handleRerunAnalysis()}
                  >
                    {hasExistingAnalysis ? "Reprocessar" : "Executar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProcessingAnalysisView({
  aiAnalysis,
}: {
  aiAnalysis: DocumentAiAnalysis | undefined;
}) {
  const ocrCompleted = Boolean(
    aiAnalysis?.job_status?.ocrProcessed || aiAnalysis?.markdown?.length,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" />
        <span>Análise em andamento</span>
      </div>
      <Table>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">OCR</TableCell>
            <TableCell className="text-right">
              <Badge variant={ocrCompleted ? "secondary" : "outline"}>
                {ocrCompleted ? "Concluído" : "Em andamento"}
              </Badge>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Revisão</TableCell>
            <TableCell className="text-right">
              <Badge variant={ocrCompleted ? "outline" : "secondary"}>
                {ocrCompleted ? "Em andamento" : "Aguardando"}
              </Badge>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

function CompletedAnalysisView({
  aiAnalysis,
  type,
}: {
  aiAnalysis: DocumentAiAnalysis;
  type: string;
}) {
  const scoreEntries = getDocumentScoreEntries(aiAnalysis.scores, type);
  const totalScore = scoreEntries.reduce((total, entry) => total + entry.value, 0);
  const maxScore = getDocumentAnalysisMaxScore(type);
  const markdown = aiAnalysis.markdown
    ?.map((page, pageIndex) => formatDocumentMarkdownPage(page, pageIndex))
    .join("\n\n---\n\n");

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">Pontuação total</TableCell>
            <TableCell className="text-right">
              {formatDocumentScore(totalScore)}
              {typeof maxScore === "number"
                ? ` / ${formatDocumentScore(maxScore)}`
                : ""}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell className="font-medium">Revisão humana</TableCell>
            <TableCell className="text-right">
              <BooleanCell value={aiAnalysis.job_status?.requiresHumanReview} />
            </TableCell>
          </TableRow>
          {scoreEntries.map((entry) => (
            <TableRow key={entry.key}>
              <TableCell className="font-medium">{entry.label}</TableCell>
              <TableCell className="text-right">
                {formatDocumentScore(entry.value)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {aiAnalysis.observations?.trim() ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">Observações</p>
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {aiAnalysis.observations.trim()}
          </p>
        </div>
      ) : null}

      {markdown ? (
        <details className="group rounded-lg border">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground">
            Markdown extraído
          </summary>
          <div className="border-t px-4 py-4">
            <div className="prose prose-neutral dark:prose-invert max-w-none text-sm">
              <Streamdown mode="static" linkSafety={{ enabled: false }}>
                {markdown}
              </Streamdown>
            </div>
          </div>
        </details>
      ) : null}
    </div>
  );
}

function FailedAnalysisView() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div>
        <p className="text-sm font-medium">A análise falhou</p>
        <p className="text-xs text-muted-foreground">
          Não foi possível concluir a revisão automática deste documento.
        </p>
      </div>
    </div>
  );
}

function UnavailableAnalysisView() {
  return (
    <div className="rounded-lg border border-dashed p-4 text-center">
      <p className="text-sm text-muted-foreground">
        Este documento ainda não possui uma análise vinculada.
      </p>
    </div>
  );
}
