"use client";

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";

import {
  DynamicTable,
  type AdminTableColumn,
} from "@/components/admin/DynamicTable";
import { BooleanCell } from "@/components/admin/DynamicTableFields";
import { DocumentAnalysisDialog } from "@/components/admin/documents/DocumentAnalysisDialog";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import type { UploadedDocumentListItem } from "@/convex/documents";
import {
  formatDocumentFileSize,
  formatDocumentScoreCell,
  getDocumentAnalysisSummary,
  getDocumentHumanReviewValue,
  getDocumentTypeLabel,
} from "@/lib/document-config";

type DocumentOperationRow = {
  _id: Doc<"docs">["_id"];
  _creationTime: number;
  fileName: string;
  fileUrl: string;
  memberName: string;
  memberDetails: string;
  type: string;
  fileSize: string;
  score: string;
  humanReview: string;
  analysis: string;
};

const memberTypeLabels: Record<Doc<"members">["type"], string> = {
  delegate: "Delegado",
  logistics: "Logística",
  press: "Imprensa",
  clerk: "Mesário",
  teacher: "Professor",
  unassigned: "Função não definida",
  admin: "Administrador",
};

export const Route = createFileRoute("/documents")({
  head: () => ({
    meta: [
      { title: "Documentos enviados — Simulação da ONU" },
      {
        name: "description",
        content: "Consulte documentos enviados pelos participantes.",
      },
    ],
  }),
  component: DocumentsPage,
});

function getMemberDetails(member: Doc<"members"> | null) {
  if (!member) {
    return "Membro não encontrado";
  }

  return [
    memberTypeLabels[member.type],
    member.tuitionId ? `Matrícula ${member.tuitionId}` : null,
    member.schoolClass ? `Turma ${member.schoolClass}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function createDocumentRow(item: UploadedDocumentListItem): DocumentOperationRow {
  return {
    _id: item.document._id,
    _creationTime: item.document._creationTime,
    fileName: item.document.uploadthing.name,
    fileUrl: item.document.uploadthing.ufsUrl,
    memberName: item.member?.name ?? String(item.document.member),
    memberDetails: getMemberDetails(item.member),
    type: item.document.type,
    fileSize: `${formatDocumentFileSize(item.document.uploadthing.size)} MB`,
    score: formatDocumentScoreCell(item.document.aiAnalysis, item.document.type),
    humanReview: getDocumentHumanReviewValue(item.document.aiAnalysis),
    analysis: getDocumentAnalysisSummary(item.document.aiAnalysis),
  };
}

function RestrictedState() {
  return (
    <Card className="border-dashed">
      <CardContent className="p-6">
        <h2 className="text-lg font-semibold">Acesso exclusivo para operação</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta área é reservada para logística, mesários e administradores.
        </p>
      </CardContent>
    </Card>
  );
}

function DocumentsPage() {
  const documentsData = useQuery(api.documents.getAllForOperation);
  const documentRows = (documentsData ?? []).map(createDocumentRow);
  const documentById = new Map(
    (documentsData ?? []).map((item) => [item.document._id, item.document]),
  );

  const documentColumns: AdminTableColumn<DocumentOperationRow>[] = [
    {
      key: "fileName",
      label: "Arquivo",
      showInForm: false,
      render: (document) => (
        <a
          href={document.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          {document.fileName}
        </a>
      ),
    },
    {
      key: "memberName",
      label: "Membro",
      showInForm: false,
      render: (document) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium text-foreground">
            {document.memberName}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {document.memberDetails}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      showInForm: false,
      render: (document) => (
        <Badge variant="secondary">{getDocumentTypeLabel(document.type)}</Badge>
      ),
    },
    {
      key: "fileSize",
      label: "Tamanho",
      showInForm: false,
      hiddenByDefault: true,
    },
    {
      key: "score",
      label: "Pontuação",
      showInForm: false,
    },
    {
      key: "humanReview",
      label: "Rev. humana",
      showInForm: false,
      render: (document) => {
        if (document.humanReview === "—") {
          return <span className="text-muted-foreground">—</span>;
        }

        return <BooleanCell value={document.humanReview} />;
      },
    },
    {
      key: "analysis",
      label: "Análise",
      showInForm: false,
      render: (document) => (
        <DocumentAnalysisDialog
          document={documentById.get(document._id) ?? null}
          fileName={document.fileName}
          type={document.type}
          showRerunAction={false}
        />
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Documentos enviados"
        description="Consulte arquivos enviados pelos participantes e acompanhe a análise automática quando disponível."
      />

      {documentsData === null ? (
        <RestrictedState />
      ) : (
        <DynamicTable
          columns={documentColumns}
          data={documentRows}
          isLoading={documentsData === undefined}
          openLabel="Abrir arquivo"
          rowKey="fileName"
          searchParamKey="_id"
          onOpen={(document) => {
            window.open(document.fileUrl, "_blank", "noopener,noreferrer");
          }}
        />
      )}
    </PageShell>
  );
}
