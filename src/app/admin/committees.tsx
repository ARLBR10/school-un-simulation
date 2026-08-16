"use client";

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import {
  DynamicTable,
  type AdminTableColumn,
} from "@/components/admin/DynamicTable";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { getCountryByCode } from "@/lib/country-list";

const emptyTopicValue = "__empty_topic__";

export const Route = createFileRoute("/admin/committees")({
  head: () => ({
    meta: [
      { title: "Comitês — Simulação da ONU" },
      {
        name: "description",
        content: "Gerencie temas, tópicos e delegações dos comitês.",
      },
    ],
  }),
  component: CommitteesPage,
});

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

function normalizeStringList(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return parseList(value);
  }

  return [];
}

function normalizeTopicList(value: unknown) {
  return normalizeStringList(value).filter((item) => item !== emptyTopicValue);
}

function parseTopics(value: string | undefined) {
  return normalizeTopicList(value);
}

function CommitteeDelegatesDialog({
  committee,
  delegates,
}: {
  committee: Doc<"committees">;
  delegates: Doc<"members">[];
}) {
  const navigate = useNavigate();

  function openMember(memberId: Doc<"members">["_id"]) {
    void navigate({ to: "/admin/members", search: { _id: memberId } });
  }

  return (
    <Dialog>
      <DialogTrigger
        render={<Button type="button" variant="outline" size="sm" />}
      >
        Ver delegados
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Delegados de {committee.theme}</DialogTitle>
          <DialogDescription>
            Membros delegados vinculados a este comitê.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 overflow-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Turma</TableHead>
                <TableHead>País representado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {delegates.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-6 text-center text-muted-foreground"
                  >
                    Nenhum delegado vinculado a este comitê.
                  </TableCell>
                </TableRow>
              ) : (
                delegates.map((delegate) => (
                  <TableRow
                    key={delegate._id}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer"
                    onClick={() => openMember(delegate._id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openMember(delegate._id);
                      }
                    }}
                  >
                    <TableCell className="font-medium">{delegate.name}</TableCell>
                    <TableCell>{delegate.tuitionId ?? "-"}</TableCell>
                    <TableCell>{delegate.schoolClass ?? "-"}</TableCell>
                    <TableCell>
                      {delegate.delegatedCountry
                        ? `${getCountryByCode(delegate.delegatedCountry)?.name} (${delegate.delegatedCountry})`
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TopicListInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const topics = normalizeStringList(value);

  function updateTopics(nextTopics: string[]) {
    onChange(nextTopics.join("\n"));
  }

  return (
    <div className="flex flex-col gap-3 rounded-md border border-input bg-background p-3">
      {topics.map((topic, index) => (
        <div key={`topic-${index}`} className="flex gap-2">
          <Input
            value={topic === emptyTopicValue ? "" : topic}
            placeholder="Ex.: Segurança alimentar"
            onChange={(event) => {
              const nextTopics = [...topics];
              const nextTopic = event.target.value;

              nextTopics[index] = nextTopic.trim()
                ? nextTopic
                : emptyTopicValue;
              updateTopics(nextTopics);
            }}
          />

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              updateTopics(
                topics.filter((_, currentIndex) => currentIndex !== index),
              );
            }}
          >
            Remover
          </Button>
        </div>
      ))}

      <div className="flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={() => updateTopics([...topics, emptyTopicValue])}
        >
          Adicionar tópico
        </Button>
      </div>
    </div>
  );
}

function TextareaInput({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  );
}

function CommitteesPage() {
  const committeesData = useQuery(api.committees.getAll);
  const membersData = useQuery(api.members.getAll);
  const committeeCreate = useMutation(api.committees.create);
  const committeeUpdate = useMutation(api.committees.update);
  const committeeDelete = useMutation(api.committees.purge);

  const committeesColumns: AdminTableColumn<Doc<"committees">>[] = [
    { key: "theme", label: "Tema" },
    {
      key: "topics",
      label: "Tópicos",
      render: (committee) =>
        normalizeTopicList(committee.topics).join(", ") || "-",
      formRender: ({ value, onChange }) => (
        <TopicListInput value={value} onChange={onChange} />
      ),
      showInTable: false,
    },
    {
      key: "description",
      label: "Descrição",
      showInTable: false,
      formRender: ({ value, onChange }) => (
        <TextareaInput value={value} onChange={onChange} />
      ),
    },
    {
      key: "_id",
      label: "Delegados",
      showInForm: false,
      render: (committee) => {
        const delegates = (membersData ?? []).filter(
          (member) =>
            member.committee === committee._id && member.type === "delegate",
        );

        return (
          <CommitteeDelegatesDialog
            committee={committee}
            delegates={delegates}
          />
        );
      },
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Comitês"
        description="Gerencie temas, tópicos e delegações vinculadas."
      />

      <DynamicTable
        columns={committeesColumns}
        data={committeesData ?? []}
        isLoading={committeesData === undefined || membersData === undefined}
        rowKey="theme"
        searchParamKey="_id"
        onCreate={async (values) => {
          const theme = normalizeRequiredString(values.theme);
          const description = normalizeRequiredString(values.description);
          const topics = parseTopics(values.topics);

          if (!theme || !description) {
            toast.error("Preencha tema e descrição para criar o comitê.");
            return false;
          }

          try {
            const created = await committeeCreate({
              theme,
              description,
              topics,
            });

            if (created === true) {
              toast.success("Comitê criado com sucesso.");
              return true;
            }

            return false;
          } catch {
            toast.error("Não foi possível criar o comitê.");
            return false;
          }
        }}
        onUpdate={async (committee, values) => {
          try {
            const updated = await committeeUpdate({
              id: committee._id,
              theme: normalizeRequiredString(values.theme) ?? undefined,
              description:
                normalizeRequiredString(values.description) ?? undefined,
              topics: parseTopics(values.topics),
            });

            if (updated === true) {
              toast.success("Comitê atualizado com sucesso.");
              return true;
            }

            return false;
          } catch {
            toast.error("Não foi possível atualizar o comitê.");
            return false;
          }
        }}
        onDelete={async (committee) => {
          try {
            const deleted = await committeeDelete({ id: committee._id });

            if (deleted === true) {
              toast.success("Comitê excluído com sucesso.");
              return true;
            }

            return false;
          } catch {
            toast.error("Não foi possível excluir o comitê.");
            return false;
          }
        }}
      />
    </PageShell>
  );
}
