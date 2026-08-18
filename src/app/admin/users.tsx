"use client";

import { createFileRoute } from "@tanstack/react-router";
import {
  DynamicTable,
  type AdminTableColumn,
} from "@/components/admin/DynamicTable";
import {
  createBooleanColumn,
  createDateColumn,
  parseBooleanValue,
} from "@/components/admin/DynamicTableFields";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { api } from "@/convex/_generated/api";
import { AuthUser } from "@/convex/auth";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

type AuthUserWithPass = AuthUser & {
  password?: string | null;
};

const userColumns: AdminTableColumn<AuthUserWithPass>[] = [
  { key: "name", label: "Nome" },
  { key: "email", label: "E-mail" },
  createBooleanColumn({
    key: "emailVerified",
    label: "E-mail Verificado",
  }),
  { key: "image", label: "Imagem", showInForm: false, showInTable: false },
  createDateColumn({
    key: "createdAt",
    label: "Data de criação",
    showInForm: false,
  }),
  createDateColumn({
    key: "updatedAt",
    label: "Ultima atualização",
    showInForm: false,
  }),
  createBooleanColumn({
    key: "twoFactorEnabled",
    label: "2FA",
    hiddenByDefault: true,
  }),
  {
    key: "isAnonymous",
    label: "Anônimo",
    showInForm: false,
    showInTable: false,
  },
  { key: "username", label: "Usuário", hiddenByDefault: true },
  {
    key: "password",
    label: "Password",
    showInTable: false,
  },
  {
    key: "displayUsername",
    label: "Usuário exibido",
    showInForm: false,
    showInTable: false,
  },
  { key: "phoneNumber", label: "Celular", hiddenByDefault: true },
  createBooleanColumn({
    key: "phoneNumberVerified",
    label: "Celular Verificado",
    hiddenByDefault: true,
  }),
];

function normalizeOptionalString(value: string | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue;
}

function parseOptionalBoolean(value: string | undefined) {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  return parseBooleanValue(value);
}

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [
      { title: "Usuários — Simulação da ONU" },
      {
        name: "description",
        content: "Administre contas, contatos e status de verificação.",
      },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const usersData = useQuery(api.auth_admin.getAll);
  const createUser = useMutation(api.auth_admin.create);
  const editUser = useMutation(api.auth_admin.edit);
  const deleteUser = useMutation(api.auth_admin.purge);

  return (
    <PageShell>
      <PageHeader
        title="Gerenciador de Usuários"
        description="Administre contas, contatos e status de verificação."
      />

      <DynamicTable<AuthUserWithPass>
        columns={userColumns}
        data={(usersData ?? []) as AuthUserWithPass[]}
        filters={[
          {
            id: "emailVerified",
            key: "emailVerified",
            label: "E-mail verificado",
            options: [
              { value: "true", label: "Verificado" },
              { value: "false", label: "Não verificado" },
            ],
          },
        ]}
        isLoading={usersData === undefined}
        rowKey="email"
        searchParamKey="_id"
        onCreate={async (values) => {
          const name = normalizeOptionalString(values.name);
          const email = normalizeOptionalString(values.email)?.toLowerCase();
          const password = normalizeOptionalString(values.password);

          if (!name || !email || !password) {
            toast.error("Preencha nome, e-mail e senha para criar o usuário.");
            return false;
          }

          try {
            const created = await createUser({
              name,
              email,
              password,
              username: normalizeOptionalString(values.username),
              cellphone: normalizeOptionalString(values.phoneNumber),
            });

            if (created === true) {
              toast.success("Usuário criado com sucesso.");
              return true;
            }

            toast.error("Não foi possível criar o usuário.");
            return false;
          } catch {
            toast.error("Não foi possível criar o usuário.");
            return false;
          }
        }}
        onUpdate={async (user, values) => {
          try {
            const updated = await editUser({
              id: user._id,
              name: normalizeOptionalString(values.name),
              email: normalizeOptionalString(values.email)?.toLowerCase(),
              emailVerified: parseOptionalBoolean(values.emailVerified),
              password: normalizeOptionalString(values.password),
              twoFactorEnabled: parseOptionalBoolean(values.twoFactorEnabled),
              username: normalizeOptionalString(values.username),
              cellphone: normalizeOptionalString(values.phoneNumber),
              cellphoneVerified: parseOptionalBoolean(
                values.phoneNumberVerified,
              ),
            });

            if (updated === true) {
              toast.success("Usuário atualizado com sucesso.");
              return true;
            }

            toast.error("Não foi possível atualizar o usuário.");
            return false;
          } catch {
            toast.error("Não foi possível atualizar o usuário.");
            return false;
          }
        }}
        onDelete={async (user) => {
          try {
            const deleted = await deleteUser({ id: user._id });

            if (deleted === true) {
              toast.success("Usuário excluído com sucesso.");
              return true;
            }

            toast.error("Não foi possível excluir o usuário.");
            return false;
          } catch {
            toast.error("Não foi possível excluir o usuário.");
            return false;
          }
        }}
      />
    </PageShell>
  );
}
