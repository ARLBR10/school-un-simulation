"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import {
  DynamicTable,
  type AdminTableColumn,
  type AdminTableSelectOption,
} from "@/components/admin/DynamicTable";
import { BooleanCell } from "@/components/admin/DynamicTableFields";
import { DocumentFileUploadInput } from "@/components/admin/documents/DocumentFileUploadInput";
import { DocumentAnalysisDialog } from "@/components/admin/documents/DocumentAnalysisDialog";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  documentTypeOptions,
  formatDocumentFileSize,
  formatDocumentScoreCell,
  getDocumentAnalysisSummary,
  getDocumentHumanReviewValue,
  getDocumentTypeLabel,
  isDocumentType,
  parseUploadedDocumentFile,
  serializeUploadedDocumentFile,
} from "@/lib/document-config";

type DocumentAdminRow = {
  _id: Doc<"docs">["_id"];
  _creationTime: number;
  member: Doc<"members">["_id"];
  fileName: string;
  fileUrl: string;
  fileSize: string;
  type: string;
  analysis: string;
  humanReview: string;
  score: string;
  upload: string;
};

function createDocumentRow(document: Doc<"docs">): DocumentAdminRow {
  return {
    _id: document._id,
    _creationTime: document._creationTime,
    member: document.member,
    fileName: document.uploadthing.name,
    fileUrl: document.uploadthing.ufsUrl,
    fileSize: `${formatDocumentFileSize(document.uploadthing.size)} MB`,
    type: document.type,
    analysis: getDocumentAnalysisSummary(document.aiAnalysis),
    humanReview: getDocumentHumanReviewValue(document.aiAnalysis),
    score: formatDocumentScoreCell(document.aiAnalysis, document.type),
    upload: serializeUploadedDocumentFile(document.uploadthing),
  };
}

export default function DocumentsPage() {
  const documentsData = useQuery(api.documents.getAll);
  const membersData = useQuery(api.members.getAll);
  const documentCreate = useMutation(api.documents.create);
  const documentUpdate = useMutation(api.documents.update);
  const documentDelete = useMutation(api.documents.purge);
  const documentRows = (documentsData ?? []).map(createDocumentRow);
  const documentById = new Map(
    (documentsData ?? []).map((document) => [document._id, document]),
  );

  const memberNameById: Record<string, string> = {};
  const memberOptions: AdminTableSelectOption[] = [];

  for (const member of membersData ?? []) {
    memberNameById[member._id] = member.name;
    memberOptions.push({
      value: member._id,
      label: member.name,
    });
  }

  for (const document of documentsData ?? []) {
    if (memberNameById[document.member]) {
      continue;
    }

    memberNameById[document.member] = document.member;
    memberOptions.push({
      value: document.member,
      label: document.member,
    });
  }

  const documentColumns: AdminTableColumn<DocumentAdminRow>[] = [
    {
      key: "fileName",
      label: "Arquivo",
      showInForm: false,
      render: (document) => (
        <Link
          href={document.fileUrl}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-foreground underline-offset-4 hover:underline"
        >
          {document.fileName}
        </Link>
      ),
    },
    {
      key: "member",
      label: "Membro",
      formSelectOptions: memberOptions,
      formSelectPlaceholder: "Selecione um membro",
      render: (document) => (
        <Link
          href={`/admin/members?_id=${document.member}`}
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          {memberNameById[document.member] ?? document.member}
        </Link>
      ),
    },
    {
      key: "type",
      label: "Tipo",
      formSelectOptions: documentTypeOptions,
      formSelectPlaceholder: "Selecione um tipo",
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
        />
      ),
    },
    {
      key: "upload",
      label: "Arquivo",
      showInTable: false,
      formRender: ({ value, onChange }) => (
        <DocumentFileUploadInput value={value} onChange={onChange} />
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Documentos"
        description="Gerencie arquivos oficiais da simulação e seus tipos."
      />

      <DynamicTable
        columns={documentColumns}
        data={documentRows}
        isLoading={documentsData === undefined || membersData === undefined}
        rowKey="fileName"
        searchParamKey="_id"
        onCreate={async (values) => {
          const member = values.member?.trim();
          const type = values.type?.trim();
          const uploadedFile = parseUploadedDocumentFile(values.upload);

          if (!member) {
            toast.error("Selecione o membro vinculado ao documento.");
            return false;
          }

          if (!type || !isDocumentType(type)) {
            toast.error("Selecione o tipo do documento.");
            return false;
          }

          if (!uploadedFile) {
            toast.error(
              "Envie um PDF, DOCX ou imagem antes de criar o documento.",
            );
            return false;
          }

          try {
            const created = await documentCreate({
              ...uploadedFile,
              member: member as Doc<"members">["_id"],
              type,
            });

            if (created === true) {
              toast.success("Documento criado com sucesso.");
              return true;
            }

            return false;
          } catch {
            toast.error("Não foi possível criar o documento.");
            return false;
          }
        }}
        onUpdate={async (document, values) => {
          const member = values.member?.trim();
          const type = values.type?.trim();
          const uploadedFile = parseUploadedDocumentFile(values.upload);

          if (member && !memberOptions.some((option) => option.value === member)) {
            toast.error("Selecione um membro válido para o documento.");
            return false;
          }

          if (type && !isDocumentType(type)) {
            toast.error("Selecione um tipo válido para o documento.");
            return false;
          }

          if (!uploadedFile) {
            toast.error("O documento precisa manter um arquivo vinculado.");
            return false;
          }

          try {
            const updated = await documentUpdate({
              id: document._id,
              member: member ? (member as Doc<"members">["_id"]) : undefined,
              type: type && isDocumentType(type) ? type : undefined,
              uploadthing: uploadedFile ?? undefined,
            });

            if (updated === true) {
              toast.success("Documento atualizado com sucesso.");
              return true;
            }

            return false;
          } catch {
            toast.error("Não foi possível atualizar o documento.");
            return false;
          }
        }}
        onDelete={async (document) => {
          try {
            const deleted = await documentDelete({ id: document._id });

            if (deleted === true) {
              toast.success("Documento excluído com sucesso.");
              return true;
            }

            return false;
          } catch {
            toast.error("Não foi possível excluir o documento.");
            return false;
          }
        }}
      />
    </PageShell>
  );
}
