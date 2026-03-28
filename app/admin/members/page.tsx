"use client";
import {
  DynamicTable,
  type AdminTableColumn,
} from "@/components/admin/DynamicTable";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";

const membersColumns: AdminTableColumn<Doc<"members">>[] = [
  { key: "name", label: "Nome" },
  { key: "class", label: "Classe", showInTable: false },
  { key: "committee", label: "Comitê" }, // @TODO: Selectable Menu
  { key: "delegate", label: "País Delegado" }, // @TODO: Selectable Menu
  { key: "type", label: "Tipo" },
  { key: "userId", label: "Usuário" },
];

export default function MembersPage() {
  const membersData = useQuery(api.members.getAll);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Gerenciador de Membros
      </h1>

      <DynamicTable
        columns={membersColumns}
        data={membersData ?? []}
        rowKey="name"
      />
    </div>
  );
}
