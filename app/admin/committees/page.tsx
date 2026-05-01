"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import {
  DynamicTable,
  type AdminTableColumn,
} from "@/components/admin/DynamicTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const emptyClerkOptionValue = "__empty_clerk__";

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

function normalizeMemberIdList(value: unknown) {
  return normalizeStringList(value).filter(
    (item) => item !== emptyClerkOptionValue,
  );
}

function parseMemberIds(value: string | undefined) {
  return normalizeMemberIdList(value) as Doc<"members">["_id"][];
}

function CommitteeDelegatesDialog({
  committee,
  delegates,
}: {
  committee: Doc<"committees">;
  delegates: Doc<"members">[];
}) {
  const router = useRouter();

  function openMember(memberId: Doc<"members">["_id"]) {
    router.push(`/admin/members?_id=${memberId}`);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Ver delegados
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Delegados de {committee.theme}</DialogTitle>
          <DialogDescription>
            Membros delegados vinculados a este comitê.
          </DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>País representado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {delegates.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
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
                  <TableCell>{delegate.delegatedCountry ?? "-"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}

function MemberIdListInput({
  value,
  members,
  onChange,
}: {
  value: string;
  members: Doc<"members">[];
  onChange: (value: string) => void;
}) {
  const selectedIds = parseList(value);

  function updateSelectedIds(nextIds: string[]) {
    onChange(nextIds.join(", "));
  }

  return (
    <div className="space-y-3 rounded-md border border-input bg-background p-3">
      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Cadastre membros antes de selecionar mesários.
        </p>
      ) : (
        <>
          {selectedIds.map((selectedId, index) => {
            const unavailableIds = new Set(
              selectedIds.filter(
                (id, currentIndex) =>
                  id !== emptyClerkOptionValue && currentIndex !== index,
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
                    <SelectValue placeholder="Selecione um mesário" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={emptyClerkOptionValue} disabled>
                      Selecione um mesário
                    </SelectItem>
                    {members.map((member) => (
                      <SelectItem
                        key={member._id}
                        value={member._id}
                        disabled={unavailableIds.has(member._id)}
                      >
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    updateSelectedIds(
                      selectedIds.filter((_, currentIndex) => currentIndex !== index),
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
              className="disabled:pointer-events-auto disabled:cursor-not-allowed disabled:bg-background disabled:text-muted-foreground disabled:hover:bg-background disabled:hover:text-muted-foreground"
              onClick={() => updateSelectedIds([...selectedIds, emptyClerkOptionValue])}
              disabled={parseMemberIds(value).length >= members.length}
            >
              Adicionar mesário
            </Button>
          </div>
        </>
      )}
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

export default function CommitteesPage() {
  const committeesData = useQuery(api.committees.getAll);
  const membersData = useQuery(api.members.getAll);
  const committeeCreate = useMutation(api.committees.create);
  const committeeUpdate = useMutation(api.committees.update);
  const committeeDelete = useMutation(api.committees.purge);

  const memberNameById: Record<string, string> = {};

  for (const member of membersData ?? []) {
    memberNameById[member._id] = member.name;
  }

  const committeesColumns: AdminTableColumn<Doc<"committees">>[] = [
    { key: "theme", label: "Tema" },
    {
      key: "clerks",
      label: "Mesários",
      render: (committee) => {
        const clerkIds = normalizeMemberIdList(committee.clerks);

        return clerkIds.length > 0
          ? clerkIds.map((clerkId) => memberNameById[clerkId] ?? clerkId).join(", ")
          : "-";
      },
      formRender: ({ value, onChange }) => (
        <MemberIdListInput
          value={value}
          members={membersData ?? []}
          onChange={onChange}
        />
      ),
      showInTable: false
    },
    {
      key: "topics",
      label: "Tópicos",
      render: (committee) => normalizeStringList(committee.topics).join(", ") || "-",
      formRender: ({ value, onChange }) => (
        <TextareaInput
          value={value}
          placeholder="Separe tópicos por vírgula ou quebra de linha"
          onChange={onChange}
        />
      ),
      showInTable: false
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
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Comitês</h1>

      <DynamicTable
        columns={committeesColumns}
        data={committeesData ?? []}
        isLoading={committeesData === undefined || membersData === undefined}
        rowKey="theme"
        searchParamKey="_id"
        onCreate={async (values) => {
          const theme = normalizeRequiredString(values.theme);
          const description = normalizeRequiredString(values.description);
          const topics = parseList(values.topics);

          if (!theme || !description) {
            toast.error("Preencha tema e descrição para criar o comitê.");
            return false;
          }

          try {
            const created = await committeeCreate({
              theme,
              description,
              topics,
              clerks: parseMemberIds(values.clerks),
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
              topics: parseList(values.topics),
              clerks: parseMemberIds(values.clerks),
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
    </div>
  );
}
