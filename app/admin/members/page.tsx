"use client";

import { useRef } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import { AdminTableSelectInput } from "@/components/admin/AdminTableSelectInput";
import {
  DynamicTable,
  type AdminTableColumn,
  type AdminTableSelectOption,
} from "@/components/admin/DynamicTable";
import { createSelectColumn } from "@/components/admin/DynamicTableFields";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { AuthUser } from "@/convex/auth";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { countries, type CountryCode } from "@/lib/country-list";

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

const noUserOptionValue = "__no_user__";
const noCommitteeOptionValue = "__no_committee__";

const countryOptions = countries.map((country) => ({
  value: country.code,
  label: `${country.name} (${country.code})`,
}));

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

function normalizeOptionalUserId(value: string | undefined) {
  if (value === noUserOptionValue) {
    return undefined;
  }

  return normalizeOptionalString(value);
}

function normalizeOptionalCommitteeId(value: string | undefined) {
  if (value === noCommitteeOptionValue) {
    return undefined;
  }

  return normalizeOptionalString(value) as Doc<"committees">["_id"] | undefined;
}

function isCountryCode(value: string): value is CountryCode {
  return countryOptions.some((option) => option.value === value);
}

function normalizeOptionalCountryCode(value: string | undefined) {
  const normalizedValue = normalizeOptionalString(value);

  if (!normalizedValue) {
    return undefined;
  }

  return isCountryCode(normalizedValue) ? normalizedValue : undefined;
}

function getUserDisplayName(user: Pick<AuthUser, "_id" | "name" | "email">) {
  return user.email && user.name
    ? `${user.name?.trim()} (${user.email?.trim()})`
    : user.email?.trim() || user._id;
}

function DelegatedCountryCombobox({
  disabled,
  value,
  onChange,
}: {
  disabled: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const comboboxPortalContainerRef = useRef<HTMLDivElement>(null);
  const selectedCountryOption =
    countryOptions.find((option) => option.value === value) ?? null;

  return (
    <div ref={comboboxPortalContainerRef}>
      <Combobox
        items={countryOptions}
        itemToStringValue={(option) => option.label}
        value={disabled ? null : selectedCountryOption}
        onValueChange={(option) => onChange(option?.value ?? "")}
        autoHighlight
      >
        <ComboboxInput
          placeholder={
            disabled
              ? "Selecione um comitê primeiro"
              : "Nome do país (código de duas letras)"
          }
          disabled={disabled}
          showClear
          className="h-10 w-full rounded-md bg-background text-foreground shadow-sm hover:bg-background dark:bg-background"
        />
        <ComboboxContent portalContainer={comboboxPortalContainerRef}>
          <ComboboxEmpty>Nenhum país encontrado.</ComboboxEmpty>
          <ComboboxList>
            {(option) => (
              <ComboboxItem key={option.value} value={option}>
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

export default function MembersPage() {
  const membersData = useQuery(api.members.getAll);
  const committeesData = useQuery(api.committees.getAll);
  const usersData = useQuery(api.auth_admin.getAll);
  const memberCreate = useMutation(api.members.create);
  const memberUpdate = useMutation(api.members.update);
  const memberDelete = useMutation(api.members.purge);

  const committeeLabelById: Record<string, string> = {};
  const committeeOptions: AdminTableSelectOption[] = [
    { value: noCommitteeOptionValue, label: "Sem comitê" },
  ];

  for (const committee of committeesData ?? []) {
    committeeLabelById[committee._id] = committee.theme;
    committeeOptions.push({
      value: committee._id,
      label: committee.theme,
    });
  }

  const userLabelById: Record<string, string> = {};
  const userOptions: AdminTableSelectOption[] = [
    { value: noUserOptionValue, label: "Sem usuário" },
  ];

  for (const user of usersData ?? []) {
    const userLabel = getUserDisplayName(user);

    userLabelById[user._id] = userLabel;
    userOptions.push({
      value: user._id,
      label: userLabel,
    });
  }

  // Preserve stale references so existing rows remain editable after user deletion.
  for (const member of membersData ?? []) {
    const userId = member.userId?.trim();

    if (!userId || userLabelById[userId]) {
      continue;
    }

    userLabelById[userId] = userId;
    userOptions.push({
      value: userId,
      label: userId,
    });
  }

  // Preserve stale references so existing rows remain editable after committee deletion.
  for (const member of membersData ?? []) {
    const committeeId = member.committee?.trim();

    if (!committeeId || committeeLabelById[committeeId]) {
      continue;
    }

    committeeLabelById[committeeId] = committeeId;
    committeeOptions.push({
      value: committeeId,
      label: committeeId,
    });
  }

  const membersColumns: AdminTableColumn<Doc<"members">>[] = [
    { key: "name", label: "Nome" },
    { key: "tuitionId", label: "Matrícula" },
    createSelectColumn({
      key: "committee",
      label: "Comitê",
      options: committeeOptions,
      placeholder: "Selecione um comitê",
      showInTable: false,
    }),
    {
      key: "delegatedCountry",
      label: "País representado",
      showInTable: false,
      formRender: ({ value, values, onChange }) => {
        const hasCommittee = Boolean(normalizeOptionalCommitteeId(values.committee));

        return (
          <DelegatedCountryCombobox
            disabled={!hasCommittee}
            value={hasCommittee ? value : ""}
            onChange={onChange}
          />
        );
      },
    },
    createSelectColumn({
      key: "type",
      label: "Tipo",
      options: memberTypeOptions,
      placeholder: "Selecione um tipo",
    }),
    {
      key: "userId",
      label: "Usuário",
      render(row) {
        if (!row.userId) {
          return "-";
        }

        return (
          <Link
            href={`/admin/users?_id=${row.userId}`}
            className="font-semibold"
          >
            {userLabelById[row.userId] ?? row.userId}
          </Link>
        );
      },
      formRender: ({ value, onChange, mode }) => (
        <AdminTableSelectInput
          fieldKey="userId"
          mode={mode}
          options={userOptions}
          placeholder="Selecione um usuário"
          value={value}
          onChange={(nextValue) =>
            onChange(nextValue === noUserOptionValue ? "" : nextValue)
          }
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">
        Gerenciador de Membros
      </h1>

      <DynamicTable
        columns={membersColumns}
        data={membersData ?? []}
        isLoading={
          membersData === undefined ||
          usersData === undefined ||
          committeesData === undefined
        }
        rowKey="name"
        searchParamKey="_id"
        onCreate={async (values) => {
          const name = normalizeOptionalString(values.name);
          const tuitionId = normalizeOptionalString(values.tuitionId);
          const committee = normalizeOptionalCommitteeId(values.committee);
          const type = values.type?.trim();

          if (!name || !type || !isMemberType(type)) {
            toast.error("Preencha nome e tipo para criar o membro.");
            return false;
          }

          try {
            const created = await memberCreate({
              name,
              tuitionId,
              type,
              userId: normalizeOptionalUserId(values.userId),
              delegatedCountry: committee
                ? normalizeOptionalCountryCode(values.delegatedCountry)
                : undefined,
              committee,
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
          const committee = normalizeOptionalCommitteeId(values.committee);
          const type = values.type?.trim();

          try {
            const updated = await memberUpdate({
              id: member._id,
              name: normalizeOptionalString(values.name),
              tuitionId: normalizeOptionalString(values.tuitionId),
              type: type && isMemberType(type) ? type : undefined,
              userId: normalizeOptionalUserId(values.userId),
              delegatedCountry: committee
                ? normalizeOptionalCountryCode(values.delegatedCountry)
                : undefined,
              committee,
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
