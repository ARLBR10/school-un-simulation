"use client";

import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Copy, QrCode, Trash2 } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { AdminTableSelectInput } from "@/components/admin/AdminTableSelectInput";
import {
  DynamicTable,
  type AdminTableColumn,
  type AdminTableSelectOption,
} from "@/components/admin/DynamicTable";
import { createSelectColumn } from "@/components/admin/DynamicTableFields";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { AuthUser } from "@/convex/auth";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { countries, type CountryCode } from "@/lib/country-list";
import {
  getAllowedCategoriesForMemberType,
  getCategoryDefinition,
} from "@/lib/grading-categories";

const memberTypeLabels: Record<Doc<"members">["type"], string> = {
  delegate: "Delegado",
  logistics: "Logística",
  press: "Imprensa",
  clerk: "Mesário",
  teacher: "Professor",
  admin: "Administrador",
};

const pressRoleLabels: Record<NonNullable<Doc<"members">["pressRole"]>, string> = {
  writer: "Redator",
  media: "Mídia",
};

export const Route = createFileRoute("/admin/members")({
  head: () => ({
    meta: [
      { title: "Membros — Simulação da ONU" },
      {
        name: "description",
        content: "Gerencie cadastros e vínculos de participantes.",
      },
    ],
  }),
  component: MembersPage,
});

const memberTypes: Doc<"members">["type"][] = [
  "delegate",
  "logistics",
  "press",
  "clerk",
  "teacher",
  "admin",
];

const noPressRoleOptionValue = "__no_press_role__";

const memberTypeOptions: AdminTableSelectOption[] = memberTypes.map((type) => ({
  value: type,
  label: memberTypeLabels[type],
  disabled: type === "admin",
}));

const pressRoleOptions: AdminTableSelectOption[] = [
  { value: noPressRoleOptionValue, label: "Sem função de imprensa" },
  { value: "writer", label: pressRoleLabels.writer },
  { value: "media", label: pressRoleLabels.media },
];

const noUserOptionValue = "__no_user__";
const noCommitteeOptionValue = "__no_committee__";

const countryOptions = countries.map((country) => ({
  value: country.code,
  label: `${country.name} (${country.code})`,
}));

const bulkMembersExample = JSON.stringify(
  [
    {
      name: "Maria Silva",
      tuitionId: "12345",
      type: "delegate",
      delegatedCountry: "BR",
    },
    {
      name: "João Santos",
      tuitionId: "67890",
      type: "press",
      pressRole: "writer",
    },
  ],
  null,
  2,
);

type BulkMemberInput = {
  name: string;
  tuitionId?: string;
  type: Doc<"members">["type"];
  pressRole?: Doc<"members">["pressRole"];
  userId?: string;
  delegatedCountry?: CountryCode;
  committee?: Doc<"committees">["_id"];
};

function formatAmount(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCreatedAt(value: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getGradingCategoryLabel(entry: Doc<"gradingEntries">) {
  return getCategoryDefinition(entry.kind, entry.category)?.label ?? entry.category;
}

function hasGradingAvailable(memberType: Doc<"members">["type"]) {
  return (
    getAllowedCategoriesForMemberType("grade", memberType).length > 0 ||
    getAllowedCategoriesForMemberType("deduction", memberType).length > 0
  );
}

function isMemberType(value: string): value is Doc<"members">["type"] {
  return memberTypes.includes(value as Doc<"members">["type"]);
}

function isPressRole(value: string): value is NonNullable<Doc<"members">["pressRole"]> {
  return value === "writer" || value === "media";
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

function normalizeNullableString(value: string | undefined) {
  return normalizeOptionalString(value) ?? null;
}

function normalizeOptionalPressRole(value: string | undefined) {
  const normalizedValue = normalizeOptionalString(value);

  if (!normalizedValue || normalizedValue === noPressRoleOptionValue) {
    return undefined;
  }

  return isPressRole(normalizedValue) ? normalizedValue : undefined;
}

function normalizeNullablePressRole(value: string | undefined) {
  return normalizeOptionalPressRole(value) ?? null;
}

function normalizeNullableUserId(value: string | undefined) {
  if (value === noUserOptionValue) {
    return null;
  }

  return normalizeNullableString(value);
}

function normalizeOptionalCommitteeId(value: string | undefined) {
  if (value === noCommitteeOptionValue) {
    return undefined;
  }

  return normalizeOptionalString(value) as Doc<"committees">["_id"] | undefined;
}

function normalizeNullableCommitteeId(value: string | undefined) {
  if (value === noCommitteeOptionValue) {
    return null;
  }

  const normalizedValue = normalizeOptionalString(value);

  return normalizedValue ? (normalizedValue as Doc<"committees">["_id"]) : null;
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

function getOptionalStringField(record: Record<string, unknown>, key: string) {
  const value = record[key];

  if (typeof value === "string") {
    return normalizeOptionalString(value);
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
}

function parseBulkMembersInput(value: string): BulkMemberInput[] {
  const parsedValue = JSON.parse(value) as unknown;

  if (!Array.isArray(parsedValue)) {
    throw new Error("O conteúdo precisa ser uma lista JSON.");
  }

  if (parsedValue.length === 0) {
    throw new Error("Informe pelo menos um membro para importar.");
  }

  if (parsedValue.length > 500) {
    throw new Error("Importe no máximo 500 membros por vez.");
  }

  return parsedValue.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`O item ${index + 1} precisa ser um objeto.`);
    }

    const record = item as Record<string, unknown>;
    const name = getOptionalStringField(record, "name");
    const type = getOptionalStringField(record, "type");
    const pressRole = getOptionalStringField(record, "pressRole");
    const normalizedPressRole = pressRole && isPressRole(pressRole) ? pressRole : undefined;
    const delegatedCountry = getOptionalStringField(record, "delegatedCountry");

    if (!name) {
      throw new Error(`O item ${index + 1} precisa de um nome.`);
    }

    if (!type || !isMemberType(type)) {
      throw new Error(`O item ${index + 1} precisa de um tipo válido.`);
    }

    if (delegatedCountry && !isCountryCode(delegatedCountry)) {
      throw new Error(`O item ${index + 1} tem um país inválido.`);
    }

    if (pressRole && !isPressRole(pressRole)) {
      throw new Error(`O item ${index + 1} tem uma função de imprensa inválida.`);
    }

    const committee = getOptionalStringField(record, "committee");

    return {
      name,
      type,
      pressRole: type === "press" ? normalizedPressRole : undefined,
      tuitionId: getOptionalStringField(record, "tuitionId"),
      userId: getOptionalStringField(record, "userId"),
      committee: committee as Doc<"committees">["_id"] | undefined,
      delegatedCountry: delegatedCountry as CountryCode | undefined,
    };
  });
}

function normalizeNullableCountryCode(value: string | undefined) {
  const normalizedValue = normalizeOptionalString(value);

  if (!normalizedValue) {
    return null;
  }

  return isCountryCode(normalizedValue) ? normalizedValue : null;
}

function getUserDisplayName(user: Pick<AuthUser, "_id" | "name" | "email">) {
  return user.email && user.name
    ? `${user.name?.trim()} (${user.email?.trim()})`
    : user.email?.trim() || user._id;
}

function getInviteUrl(token: string, origin: string) {
  return `${origin}/invites?token=${encodeURIComponent(token)}`;
}

function MemberInviteDialog({
  member,
  invite,
  onCreateInvite,
  onDeleteInvite,
}: {
  member: Doc<"members">;
  invite: Doc<"memberInvites"> | null;
  onCreateInvite: (member: Doc<"members">) => Promise<Doc<"memberInvites"> | null>;
  onDeleteInvite: (member: Doc<"members">) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [localInvite, setLocalInvite] = useState<Doc<"memberInvites"> | null>(invite);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [origin, setOrigin] = useState("");
  const currentInvite = localInvite;
  const inviteUrl = currentInvite && origin ? getInviteUrl(currentInvite.token, origin) : "";
  const isExpired = currentInvite ? currentInvite.expiresAt <= Date.now() : false;

  useEffect(() => {
    setLocalInvite(invite);
  }, [invite]);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  async function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    if (!nextOpen || currentInvite || member.userId) {
      return;
    }

    setIsCreating(true);

    try {
      const createdInvite = await onCreateInvite(member);
      setLocalInvite(createdInvite);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopyInvite() {
    if (!inviteUrl) {
      return;
    }

    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Link do convite copiado.");
  }

  async function handleDeleteInvite() {
    setIsDeleting(true);

    try {
      const deleted = await onDeleteInvite(member);

      if (deleted) {
        setLocalInvite(null);
        setOpen(false);
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => void handleOpenChange(nextOpen)}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={Boolean(member.userId)}
        >
          <QrCode data-icon="inline-start" />
          {currentInvite ? "Ver convite" : "Gerar convite"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convite de vínculo</DialogTitle>
          <DialogDescription>
            Envie este link para {member.name} vincular a conta ao cadastro de membro.
          </DialogDescription>
        </DialogHeader>

        {isCreating ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Gerando convite...
          </div>
        ) : currentInvite && inviteUrl ? (
          <div className="flex flex-col gap-4">
            <div className="mx-auto rounded-xl bg-white p-3">
              <QRCodeSVG
                value={inviteUrl}
                size={224}
                bgColor="#ffffff"
                fgColor="#000000"
                level="M"
                role="img"
                aria-label="QRCode do convite"
              />
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Link copiável
              </p>
              <p className="break-all font-mono text-xs text-foreground">{inviteUrl}</p>
            </div>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span>
                Expira em {formatCreatedAt(currentInvite.expiresAt)}.
              </span>
              {isExpired ? (
                <span className="font-medium text-destructive">
                  Este convite expirou. Exclua-o para gerar um novo.
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Não foi possível carregar o convite.
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            disabled={!currentInvite || isDeleting}
            onClick={() => void handleDeleteInvite()}
          >
            <Trash2 data-icon="inline-start" />
            Excluir
          </Button>
          <Button
            type="button"
            disabled={!inviteUrl}
            onClick={() => void handleCopyInvite()}
          >
            <Copy data-icon="inline-start" />
            Copiar link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
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

function MemberGradingDialog({
  member,
  entries,
  disabled = false,
}: {
  member: Doc<"members">;
  entries: Doc<"gradingEntries">[];
  disabled?: boolean;
}) {
  const orderedEntries = [...entries].sort(
    (leftEntry, rightEntry) => leftEntry._creationTime - rightEntry._creationTime,
  );
  const totalGrades = orderedEntries.reduce(
    (total, entry) => total + (entry.kind === "grade" ? entry.amount : 0),
    0,
  );
  const totalDeductions = orderedEntries.reduce(
    (total, entry) => total + (entry.kind === "deduction" ? entry.amount : 0),
    0,
  );
  const netTotal = totalGrades - totalDeductions;
  let runningTotal = 0;
  const orderedEntriesWithTotals = orderedEntries.map((entry) => {
    const signedAmount = entry.kind === "grade" ? entry.amount : -entry.amount;
    runningTotal += signedAmount;

    return { entry, signedAmount, runningTotal };
  });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          Ver notas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Histórico de notas de {member.name}</DialogTitle>
          <DialogDescription>
            Contagem completa de pontuações e deduções em ordem cronológica.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-3" aria-live="polite">
          <div className="rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Pontuações adicionadas
            </p>
            <p className="text-lg font-semibold">{formatAmount(totalGrades)}</p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Deduções removidas
            </p>
            <p className="text-lg font-semibold">{formatAmount(totalDeductions)}</p>
          </div>
          <div className="rounded-xl border bg-muted/20 p-3">
            <p className="text-xs font-medium text-muted-foreground">Total</p>
            <p className="text-lg font-semibold">{formatAmount(netTotal)}</p>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-auto rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Movimento</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Total parcial</TableHead>
                <TableHead>Observação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedEntries.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-6 text-center text-muted-foreground"
                  >
                    Nenhuma pontuação ou dedução lançada para este membro.
                  </TableCell>
                </TableRow>
              ) : (
                orderedEntriesWithTotals.map(
                  ({ entry, signedAmount, runningTotal: currentTotal }) => {
                    return (
                      <TableRow key={entry._id}>
                        <TableCell>{formatCreatedAt(entry._creationTime)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              entry.kind === "grade" ? "secondary" : "destructive"
                            }
                          >
                            {entry.kind === "grade" ? "Adicionado" : "Removido"}
                          </Badge>
                        </TableCell>
                        <TableCell>{getGradingCategoryLabel(entry)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {signedAmount > 0 ? "+" : "-"}
                          {formatAmount(Math.abs(signedAmount))}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAmount(currentTotal)}
                        </TableCell>
                        <TableCell className="max-w-64 whitespace-normal text-muted-foreground">
                          {entry.note ?? "-"}
                        </TableCell>
                      </TableRow>
                    );
                  },
                )
              )}
            </TableBody>
            {orderedEntries.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4}>Total final</TableCell>
                  <TableCell className="text-right">
                    {formatAmount(netTotal)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function BulkCreateMembersDialog({
  onBulkCreate,
}: {
  onBulkCreate: (members: BulkMemberInput[]) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(bulkMembersExample);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setIsSubmitting(true);

    try {
      const members = parseBulkMembersInput(value);
      const created = await onBulkCreate(members);

      if (created) {
        setOpen(false);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível interpretar a lista de membros.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Importar em lote
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar membros em lote</DialogTitle>
          <DialogDescription>
            Cole uma lista JSON com até 500 membros. Use os mesmos nomes de campos
            da tabela: name, tuitionId, type, userId, committee e delegatedCountry.
          </DialogDescription>
        </DialogHeader>

        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="min-h-96 font-mono text-xs"
          aria-label="Lista JSON de membros"
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
            Importar membros
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MembersPage() {
  const membersData = useQuery(api.members.getAll);
  const committeesData = useQuery(api.committees.getAll);
  const usersData = useQuery(api.auth_admin.getAll);
  const gradingData = useQuery(api.grading.getAll);
  const invitesData = useQuery(api.memberInvites.getAllForAdmin);
  const memberCreate = useMutation(api.members.create);
  const memberBulkCreate = useMutation(api.members.bulkCreate);
  const memberUpdate = useMutation(api.members.update);
  const memberDelete = useMutation(api.members.purge);
  const memberInviteCreate = useMutation(api.memberInvites.createForMember);
  const memberInviteDelete = useMutation(api.memberInvites.deleteForMember);

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

  const inviteByMemberId: Record<string, Doc<"memberInvites">> = {};

  for (const invite of invitesData ?? []) {
    inviteByMemberId[invite.member] = invite;
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
      key: "pressRole",
      label: "Função na imprensa",
      render: (member) =>
        member.type === "press" && member.pressRole
          ? pressRoleLabels[member.pressRole]
          : "-",
      formRender: ({ value, values, onChange, mode }) => {
        const isPress = values.type === "press";

        return (
          <AdminTableSelectInput
            fieldKey="pressRole"
            mode={mode}
            options={pressRoleOptions}
            placeholder="Selecione uma função"
            value={isPress ? value : noPressRoleOptionValue}
            onChange={(nextValue) =>
              onChange(nextValue === noPressRoleOptionValue ? "" : nextValue)
            }
          />
        );
      },
      hiddenByDefault: true,
    },
    {
      key: "userId",
      label: "Usuário",
      render(row) {
        if (!row.userId) {
          return (
            <MemberInviteDialog
              member={row}
              invite={inviteByMemberId[row._id] ?? null}
              onCreateInvite={async (selectedMember) => {
                try {
                  const createdInvite = await memberInviteCreate({
                    member: selectedMember._id,
                  });

                  if (createdInvite) {
                    toast.success("Convite pronto para compartilhamento.");
                    return createdInvite;
                  }

                  return null;
                } catch (error) {
                  toast.error(
                    error instanceof Error
                      ? error.message
                      : "Não foi possível criar o convite.",
                  );
                  return null;
                }
              }}
              onDeleteInvite={async (selectedMember) => {
                try {
                  const deleted = await memberInviteDelete({
                    member: selectedMember._id,
                  });

                  if (deleted === true) {
                    toast.success("Convite excluído com sucesso.");
                    return true;
                  }

                  return false;
                } catch {
                  toast.error("Não foi possível excluir o convite.");
                  return false;
                }
              }}
            />
          );
        }

        return (
          <Link
            to="/admin/users"
            search={{ _id: row.userId }}
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
    {
      key: "_id",
      label: "Notas",
      showInForm: false,
      render: (member) => (
        <MemberGradingDialog
          member={member}
          entries={(gradingData ?? []).filter((entry) => entry.member === member._id)}
          disabled={!hasGradingAvailable(member.type)}
        />
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeader
        title="Gerenciador de Membros"
        description="Cadastre participantes, defina funções e vincule delegados aos comitês."
        action={
          <BulkCreateMembersDialog
            onBulkCreate={async (members) => {
              try {
                const result = await memberBulkCreate({ members });

                if (result) {
                  toast.success(`${result.created} membros importados com sucesso.`);
                  return true;
                }

                return false;
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Não foi possível importar os membros.",
                );
                return false;
              }
            }}
          />
        }
      />

      <DynamicTable
        columns={membersColumns}
        data={membersData ?? []}
        isLoading={
          membersData === undefined ||
          usersData === undefined ||
          committeesData === undefined ||
          gradingData === undefined ||
          invitesData === undefined
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
              pressRole:
                type === "press"
                  ? (normalizeOptionalPressRole(values.pressRole) ?? "writer")
                  : undefined,
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
          const committee = normalizeNullableCommitteeId(values.committee);
          const type = values.type?.trim();

          try {
            const updated = await memberUpdate({
              id: member._id,
              name: normalizeOptionalString(values.name),
              tuitionId: normalizeNullableString(values.tuitionId),
              type: type && isMemberType(type) ? type : undefined,
              pressRole:
                type === "press"
                  ? normalizeNullablePressRole(values.pressRole)
                  : null,
              userId: normalizeNullableUserId(values.userId),
              delegatedCountry: committee
                ? normalizeNullableCountryCode(values.delegatedCountry)
                : null,
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
    </PageShell>
  );
}
