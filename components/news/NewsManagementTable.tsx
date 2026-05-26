"use client";

import { useMutation } from "convex/react";
import { toast } from "sonner";

import {
  DynamicTable,
  type AdminTableColumn,
} from "@/components/admin/DynamicTable";
import { AdminTableSelectInput } from "@/components/admin/AdminTableSelectInput";
import { createDateColumn } from "@/components/admin/DynamicTableFields";
import { MarkdownEditorDialogInput } from "@/components/admin/MarkdownEditorDialogInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import type { NewsManageItem } from "@/convex/news";

const emptyAuthorValue = "__empty_author__";
const emptyCommitteeValue = "__empty_committee__";

const approvalStatusLabels = {
  pending: "Pendente",
  approved: "Publicado",
  denied: "Negado",
} as const;

const approvalStatusOptions = [
  { value: "pending", label: approvalStatusLabels.pending },
  { value: "approved", label: approvalStatusLabels.approved },
  { value: "denied", label: approvalStatusLabels.denied },
];

type CommitteeOption = Pick<Doc<"committees">, "_id" | "theme">;
type NewsManagementRow = Doc<"news"> &
  Partial<Pick<NewsManageItem, "authorName" | "committeeNames">>;

function normalizeRequiredString(value: string | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  return trimmedValue;
}

function parseList(value: string | undefined) {
  return (value ?? "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAuthorId(value: string | undefined) {
  const authorId = value?.trim();

  if (!authorId || authorId === emptyAuthorValue) {
    return null;
  }

  return authorId as Doc<"members">["_id"];
}

function parseCommitteeIds(value: string | undefined) {
  return parseList(value).filter(
    (committeeId) => committeeId !== emptyCommitteeValue,
  ) as Doc<"committees">["_id"][];
}

function normalizeCommitteeIds(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .filter((item) => item !== emptyCommitteeValue);
  }

  if (typeof value === "string") {
    return parseCommitteeIds(value);
  }

  return [];
}

function parseApprovalStatus(value: string | undefined) {
  if (value === "pending" || value === "approved" || value === "denied") {
    return value;
  }

  return undefined;
}

function renderBodyPreview(body: string) {
  const preview = body.replace(/\s+/g, " ").trim();

  if (!preview) {
    return "-";
  }

  return preview.length > 96 ? `${preview.slice(0, 96)}...` : preview;
}

function CommitteeListInput({
  value,
  committees,
  onChange,
}: {
  value: string;
  committees: CommitteeOption[];
  onChange: (value: string) => void;
}) {
  const selectedIds = parseList(value);

  function updateSelectedIds(nextIds: string[]) {
    onChange(nextIds.join(", "));
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-input bg-background p-3">
      {selectedIds.map((selectedId, index) => {
        const unavailableIds = new Set(
          selectedIds.filter(
            (id, currentIndex) =>
              id !== emptyCommitteeValue && currentIndex !== index,
          ),
        );

        return (
          <div key={`${selectedId}-${index}`} className="flex gap-2">
            <AdminTableSelectInput
              fieldKey={`news-committee-${index}`}
              mode="create"
              options={committees.map((committee) => ({
                value: committee._id,
                label: committee.theme,
                disabled: unavailableIds.has(committee._id),
              }))}
              placeholder="Selecione um comitê"
              value={selectedId === emptyCommitteeValue ? "" : selectedId}
              onChange={(nextId) => {
                const nextIds = [...selectedIds];

                nextIds[index] = nextId;
                updateSelectedIds(nextIds);
              }}
            />

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                updateSelectedIds(
                  selectedIds.filter(
                    (_, currentIndex) => currentIndex !== index,
                  ),
                );
              }}
            >
              Remover
            </Button>
          </div>
        );
      })}

      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            updateSelectedIds([...selectedIds, emptyCommitteeValue])
          }
          disabled={parseCommitteeIds(value).length >= committees.length}
        >
          Adicionar comitê
        </Button>
      </div>
    </div>
  );
}

export function NewsManagementTable({
  newsData,
  membersData,
  committeesData,
  currentAuthorId,
  allowCreate = true,
  allowAuthorSelection = false,
  canApprove = false,
  allowApprovalStatusEdit = false,
  isLoading,
}: {
  newsData: NewsManagementRow[] | null | undefined;
  membersData?: Doc<"members">[] | null;
  committeesData: CommitteeOption[] | null | undefined;
  currentAuthorId?: Doc<"members">["_id"];
  allowCreate?: boolean;
  allowAuthorSelection?: boolean;
  canApprove?: boolean;
  allowApprovalStatusEdit?: boolean;
  isLoading?: boolean;
}) {
  const newsCreate = useMutation(api.news.create);
  const newsUpdate = useMutation(api.news.update);
  const newsDelete = useMutation(api.news.purge);
  const newsApprove = useMutation(api.news.approve);
  const newsDeny = useMutation(api.news.deny);

  const memberNameById: Record<string, string> = {};
  const committeeThemeById: Record<string, string> = {};

  for (const member of membersData ?? []) {
    memberNameById[member._id] = member.name;
  }

  for (const committee of committeesData ?? []) {
    committeeThemeById[committee._id] = committee.theme;
  }

  const authorOptions = [
    { value: emptyAuthorValue, label: "Sem autor" },
    ...(membersData ?? []).map((member) => ({
      value: member._id,
      label: member.name,
    })),
  ];

  const newsColumns: AdminTableColumn<NewsManagementRow>[] = [
    { key: "title", label: "Título" },
    {
      key: "approvalStatus",
      label: "Status",
      render: (news) => {
        const status = news.approvalStatus ?? "approved";

        return (
          <Badge
            variant={
              status === "approved"
                ? "default"
                : status === "denied"
                  ? "destructive"
                  : "outline"
            }
          >
            {approvalStatusLabels[status]}
          </Badge>
        );
      },
      formSelectOptions: approvalStatusOptions,
      formSelectPlaceholder: "Selecione um status",
      showInCreateForm: false,
      showInEditForm: allowApprovalStatusEdit,
    },
    {
      key: "author",
      label: "Autor",
      render: (news) => {
        if (!news.author) {
          return "Sem autor";
        }

        return news.authorName ?? memberNameById[news.author] ?? news.author;
      },
      formSelectOptions: authorOptions,
      formSelectPlaceholder: "Selecione um autor",
      showInForm: allowAuthorSelection,
    },
    {
      key: "committee",
      label: "Comitês",
      render: (news) => {
        const committeeIds = normalizeCommitteeIds(news.committee);

        if (committeeIds.length === 0) {
          return "Todos";
        }

        return committeeIds
          .map((committeeId) => committeeThemeById[committeeId] ?? committeeId)
          .join(", ");
      },
      formRender: ({ value, onChange }) => (
        <CommitteeListInput
          value={value}
          committees={committeesData ?? []}
          onChange={onChange}
        />
      ),
      hiddenByDefault: true,
    },
    {
      key: "body",
      label: "Corpo",
      render: (news) => renderBodyPreview(news.body),
      formRender: ({ value, onChange }) => (
        <MarkdownEditorDialogInput value={value} onChange={onChange} />
      ),
      showInTable: false,
    },
    createDateColumn({
      key: "_creationTime",
      label: "Criado em",
    }),
    {
      key: "_id",
      label: "Revisão",
      showInForm: false,
      render: (news) => {
        if (!canApprove || news.approvalStatus !== "pending") {
          return "-";
        }

        return (
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={async () => {
                try {
                  const approved = await newsApprove({ id: news._id });

                  if (approved === true) {
                    toast.success("Notícia aprovada e publicada.");
                  }
                } catch {
                  toast.error("Não foi possível aprovar a notícia.");
                }
              }}
            >
              Aprovar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={async () => {
                try {
                  const denied = await newsDeny({ id: news._id });

                  if (denied === true) {
                    toast.success("Notícia negada.");
                  }
                } catch {
                  toast.error("Não foi possível negar a notícia.");
                }
              }}
            >
              Negar
            </Button>
          </div>
        );
      },
      hiddenByDefault: !canApprove,
    },
  ];

  return (
    <DynamicTable
      columns={newsColumns}
      data={newsData ?? []}
      isLoading={isLoading}
      rowKey="title"
      searchParamKey="_id"
      onCreate={allowCreate ? async (values) => {
        const title = normalizeRequiredString(values.title);
        const body = normalizeRequiredString(values.body);
        const author = allowAuthorSelection
          ? parseAuthorId(values.author)
          : (currentAuthorId ?? null);
        const committee = parseCommitteeIds(values.committee);

        if (!title || !body) {
          toast.error("Preencha título e corpo para criar a notícia.");
          return false;
        }

        try {
          const created = await newsCreate({
            title,
            body,
            ...(allowAuthorSelection ? { author } : author ? { author } : {}),
            ...(committee.length > 0 ? { committee } : {}),
          });

          if (created === true) {
            toast.success(
              canApprove
                ? "Notícia criada e publicada."
                : "Notícia enviada para aprovação.",
            );
            return true;
          }

          return false;
        } catch {
          toast.error("Não foi possível criar a notícia.");
          return false;
        }
      } : undefined}
      onUpdate={async (news, values) => {
        const title = normalizeRequiredString(values.title);
        const body = normalizeRequiredString(values.body);

        if (!title || !body) {
          toast.error("Título e corpo da notícia não podem ficar vazios.");
          return false;
        }

        try {
          const updated = await newsUpdate({
            id: news._id,
            title,
            body,
            ...(allowAuthorSelection
              ? { author: parseAuthorId(values.author) }
              : {}),
            committee: parseCommitteeIds(values.committee),
            ...(allowApprovalStatusEdit
              ? { approvalStatus: parseApprovalStatus(values.approvalStatus) }
              : {}),
          });

          if (updated === true) {
            toast.success(
              canApprove
                ? "Notícia atualizada com sucesso."
                : "Notícia atualizada e enviada para aprovação.",
            );
            return true;
          }

          return false;
        } catch {
          toast.error("Não foi possível atualizar a notícia.");
          return false;
        }
      }}
      onDelete={async (news) => {
        try {
          const deleted = await newsDelete({ id: news._id });

          if (deleted === true) {
            toast.success("Notícia excluída com sucesso.");
            return true;
          }

          return false;
        } catch {
          toast.error("Não foi possível excluir a notícia.");
          return false;
        }
      }}
    />
  );
}
