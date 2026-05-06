"use client";

import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import {
  DynamicTable,
  type AdminTableColumn,
} from "@/components/admin/DynamicTable";
import { createDateColumn } from "@/components/admin/DynamicTableFields";
import { MarkdownEditorDialogInput } from "@/components/admin/MarkdownEditorDialogInput";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
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

const emptyAuthorValue = "__empty_author__";
const emptyCommitteeValue = "__empty_committee__";

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
  committees: Doc<"committees">[];
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

export default function AdminNewsPage() {
  const newsData = useQuery(api.news.getAll);
  const membersData = useQuery(api.members.getAll);
  const committeesData = useQuery(api.committees.getAll);
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

  const newsColumns: AdminTableColumn<Doc<"news">>[] = [
    { key: "title", label: "Título" },
    {
      key: "author",
      label: "Autor",
      render: (news) =>
        news.author
          ? (memberNameById[news.author] ?? news.author)
          : "Sem autor",
      formSelectOptions: authorOptions,
      formSelectPlaceholder: "Selecione um autor",
    },
    {
      key: "committee",
      label: "Comitês",
      render: (news) => {
        const committeeIds = normalizeCommitteeIds(news.committee);

        return committeeIds.length > 0
          ? committeeIds
              .map(
                (committeeId) => committeeThemeById[committeeId] ?? committeeId,
              )
              .join(", ")
          : "Todos";
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
    <PageShell>
      <PageHeader
        title="Notícias"
        description="Gerencie comunicados e publicações da simulação em markdown."
      />

      <DynamicTable
        columns={newsColumns}
        data={newsData ?? []}
        isLoading={
          newsData === undefined ||
          membersData === undefined ||
          committeesData === undefined
        }
        rowKey="title"
        searchParamKey="_id"
        onCreate={async (values) => {
          const title = normalizeRequiredString(values.title);
          const body = normalizeRequiredString(values.body);
          const author = parseAuthorId(values.author);
          const committee = parseCommitteeIds(values.committee);

          if (!title || !body) {
            toast.error("Preencha título e corpo para criar a notícia.");
            return false;
          }

          try {
            const created = await newsCreate({
              title,
              body,
              ...(author ? { author } : {}),
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
              author: parseAuthorId(values.author),
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
    </PageShell>
  );
}
