"use client";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import {
  DynamicTable,
  type AdminTableColumn,
  type AdminTableSelectOption,
} from "@/components/admin/DynamicTable";
import { createSelectColumn } from "@/components/admin/DynamicTableFields";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";

const memberTypeLabels: Record<Doc<"members">["type"], string> = {
  delegate: "Delegado",
  logistics: "Logística",
  press: "Imprensa",
  clerk: "Mesário",
  teacher: "Professor",
  admin: "Administrador",
};

const memberTypes: Doc<"members">["type"][] = [
  "delegate",
  "logistics",
  "press",
  "clerk",
  "teacher",
  "admin",
];

const memberTypeOptions: AdminTableSelectOption[] = memberTypes.map((type) => ({
  value: type,
  label: memberTypeLabels[type],
  disabled: type === "admin",
}));

const membersColumns: AdminTableColumn<Doc<"members">>[] = [
  { key: "name", label: "Nome" },
  { key: "class", label: "Classe", showInTable: false },
  { key: "committee", label: "Comitê", showInTable: false }, // @TODO: Selectable Menu
  { key: "delegate", label: "País Delegado", showInTable: false }, // @TODO: Selectable Menu
  createSelectColumn({
    key: "type",
    label: "Tipo",
    options: memberTypeOptions,
    placeholder: "Selecione um tipo",
  }),
  { key: "userId", label: "Usuário" },
];

function isMemberType(value: string): value is Doc<"members">["type"] {
  return memberTypes.includes(value as Doc<"members">["type"]);
}

function normalizeOptionalString(value: string | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue;
}

export default function MembersPage() {
  const membersData = useQuery(api.members.getAll);
  const memberCreate = useMutation(api.members.create);
  const memberUpdate = useMutation(api.members.update);
  const memberDelete = useMutation(api.members.purge);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Gerenciador de Membros
      </h1>

      <DynamicTable
        columns={membersColumns}
        data={membersData ?? []}
        isLoading={membersData === undefined}
        rowKey="name"
        onCreate={async (values) => {
          const name = normalizeOptionalString(values.name);
          const memberClass = normalizeOptionalString(values.class);
          const type = values.type?.trim();

          if (!name || !type || !isMemberType(type)) {
            toast.error("Preencha nome, classe e tipo para criar o membro.");
            return false;
          }

          try {
            const created = await memberCreate({
              name,
              class: memberClass,
              type,
              userId: normalizeOptionalString(values.userId),
              delegate: normalizeOptionalString(values.delegate),
            });

            if (created === true) {
              toast.success("Membro criado com sucesso.");
              return true;
            }

            return false;
          } catch {
            toast.error("Não foi possível criar o membro.");
            return false;
          }
        }}
        onUpdate={async (member, values) => {
          const type = values.type?.trim();

          try {
            const updated = await memberUpdate({
              id: member._id,
              name: normalizeOptionalString(values.name),
              class: normalizeOptionalString(values.class),
              type: type && isMemberType(type) ? type : undefined,
              userId: normalizeOptionalString(values.userId),
              delegate: normalizeOptionalString(values.delegate),
            });

            if (updated === true) {
              toast.success("Membro atualizado com sucesso.");
              return true;
            }

            return false;
          } catch {
            toast.error("Não foi possível atualizar o membro.");
            return false;
          }
        }}
        onDelete={async (member) => {
          try {
            const deleted = await memberDelete({ id: member._id });

            if (deleted === true) {
              toast.success("Membro excluído com sucesso.");
              return true;
            }

            return false;
          } catch {
            toast.error("Não foi possível excluir o membro.");
            return false;
          }
        }}
      />
    </div>
  );
}
