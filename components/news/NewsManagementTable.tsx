"use client";

import { useMutation } from "convex/react";
import { toast } from "sonner";

import {
  DynamicTable,
  type AdminTableColumn,
} from "@/components/admin/DynamicTable";
import { createDateColumn } from "@/components/admin/DynamicTableFields";
import { MarkdownEditorDialogInput } from "@/components/admin/MarkdownEditorDialogInput";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import type { NewsManageItem } from "@/convex/news";

const emptyAuthorValue = "__empty_author__";
const emptyCommitteeValue = "__empty_committee__";

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
            <Select
              value={selectedId || undefined}
              onValueChange={(nextId) => {
                const nextIds = [...selectedIds];

                nextIds[index] = nextId;
                updateSelectedIds(nextIds);
              }}
            >
              <SelectTrigger className="w-full rounded-md border-input bg-background px-3 text-foreground shadow-sm hover:bg-background dark:bg-background data-[size=default]:h-10">
                <SelectValue placeholder="Selecione um comitê" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value={emptyCommitteeValue} disabled>
                    Selecione um comitê
                  </SelectItem>
                  {committees.map((committee) => (
                    <SelectItem
                      key={committee._id}
                      value={committee._id}
                      disabled={unavailableIds.has(committee._id)}
                    >
                      {committee.theme}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

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
  allowAuthorSelection = false,
  isLoading,
}: {
  newsData: NewsManagementRow[] | null | undefined;
  membersData?: Doc<"members">[] | null;
  committeesData: CommitteeOption[] | null | undefined;
  currentAuthorId?: Doc<"members">["_id"];
  allowAuthorSelection?: boolean;
  isLoading?: boolean;
}) {
  const newsCreate = useMutation(api.news.create);
  const newsUpdate = useMutation(api.news.update);
  const newsDelete = useMutation(api.news.purge);

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
  ];

  return (
    <DynamicTable
      columns={newsColumns}
      data={newsData ?? []}
      isLoading={isLoading}
      rowKey="title"
      searchParamKey="_id"
      onCreate={async (values) => {
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
            toast.success("Notícia criada com sucesso.");
            return true;
          }

          return false;
        } catch {
          toast.error("Não foi possível criar a notícia.");
          return false;
        }
      }}
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
          });

          if (updated === true) {
            toast.success("Notícia atualizada com sucesso.");
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
