"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ListChecks, MinusCircle, Pencil, PlusCircle, Users } from "lucide-react";
import { toast } from "sonner";

import {
  DynamicTable,
  type AdminTableColumn,
  type AdminTableSelectOption,
} from "@/components/admin/DynamicTable";
import { AdminTableSelectInput } from "@/components/admin/AdminTableSelectInput";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  getAllowedCategoriesForMemberAndGraderType,
  getCategoryDefinition,
  type GradingMemberType,
} from "@/lib/grading-categories";
import { getCountryByCode } from "@/lib/country-list";

type GradingEntryKind = Doc<"gradingEntries">["kind"];

type GradingEntryRow = Doc<"gradingEntries"> & {
  memberName: string;
  memberCountry: string;
  memberDetails: string;
  memberCommittee: string;
};

type MemberMetadata = ReturnType<typeof buildMemberMetadata>;

type MemberSummary = {
  member: Doc<"members">;
  name: string;
  details: string;
  country: string;
  committee: string;
  entries: GradingEntryRow[];
};

type MemberSelectionRow = {
  _id: Doc<"members">["_id"];
  name: string;
  details: string;
  country: string;
  committee: string;
  gradeTotal: number;
  deductionTotal: number;
  balance: number;
};

type EntryFormValues = {
  member?: string;
  category?: string;
  amount?: string;
  note?: string;
};

type GradingManagementPanelProps = {
  title: string;
  description: string;
  restrictedTitle: string;
  restrictedDescription: string;
  showAdminLinks?: boolean;
};

const duplicateGradingEntryErrorCode = "duplicate_grading_entry";
const duplicateGradingEntryMessage =
  "Este lançamento já existe para este membro.";

function normalizeRequiredString(value: string | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return null;
  }

  return trimmedValue;
}

function normalizeOptionalString(value: string | undefined) {
  const trimmedValue = value?.trim();

  if (!trimmedValue) {
    return undefined;
  }

  return trimmedValue;
}

function parseAmount(value: string | undefined) {
  const normalizedValue = value?.trim().replace(",", ".");

  if (!normalizedValue) {
    return null;
  }

  const amount = Number(normalizedValue);

  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

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

function getMutationErrorMessage(error: unknown, fallback: string) {
  if (
    error instanceof Error &&
    error.message.includes(duplicateGradingEntryErrorCode)
  ) {
    return duplicateGradingEntryMessage;
  }

  return fallback;
}

function AmountInput({
  value,
  maxAmount,
  defaultToMax = false,
  onChange,
}: {
  value: string;
  maxAmount?: number;
  defaultToMax?: boolean;
  onChange: (value: string) => void;
}) {
  const parsedAmount = parseAmount(value);
  const sliderValue =
    maxAmount !== undefined
      ? Math.min(parsedAmount ?? (defaultToMax ? maxAmount : 0), maxAmount)
      : 0;

  useEffect(() => {
    if (
      maxAmount === undefined ||
      parsedAmount === sliderValue ||
      (parsedAmount === null && !defaultToMax)
    ) {
      return;
    }

    onChange(String(Number(sliderValue.toFixed(2))));
  }, [defaultToMax, maxAmount, onChange, parsedAmount, sliderValue]);

  if (maxAmount !== undefined) {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-input bg-background px-3 py-3">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">Pontos</span>
          <span className="font-medium">
            {formatAmount(sliderValue)} / {formatAmount(maxAmount)}
          </span>
        </div>
        <Slider
          value={[sliderValue]}
          min={0}
          max={maxAmount}
          step={0.1}
          onValueChange={([nextValue]) => {
            onChange(String(Number(nextValue.toFixed(2))));
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Input
        type="number"
        inputMode="decimal"
        step="0.01"
        min="0"
        value={value}
        placeholder="Ex.: 0,5"
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function formatCategoryLabel(
  category: {
    label: string;
    maxAmount: number;
    day?: 1 | 2;
  },
  kind: GradingEntryKind,
) {
  const dayLabel = category.day ? `Dia ${category.day} · ` : "";
  const amountLabel = kind === "deduction" ? "valor" : "máx.";

  return `${dayLabel}${category.label} (${amountLabel} ${formatAmount(category.maxAmount)})`;
}

function CategorySelectInput({
  kind,
  memberId,
  memberTypeById,
  entries,
  currentEntryId,
  graderType,
  isAdmin,
  value,
  onChange,
}: {
  kind: GradingEntryKind;
  memberId: string | undefined;
  memberTypeById: Record<string, Doc<"members">["type"]>;
  entries: GradingEntryRow[];
  currentEntryId?: Doc<"gradingEntries">["_id"];
  graderType: GradingMemberType | undefined;
  isAdmin: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const memberType = memberId ? memberTypeById[memberId] : undefined;
  const categories = getAllowedCategoriesForMemberAndGraderType(
    kind,
    memberType,
    graderType,
    isAdmin,
  );
  const disabledCategoryValues = new Set(
    entries
      .filter(
        (entry) =>
          entry._id !== currentEntryId &&
          entry.member === memberId &&
          entry.kind === kind,
      )
      .map((entry) => entry.category),
  );

  if (!memberId) {
    return (
      <Input disabled value="" placeholder="Selecione um membro primeiro" />
    );
  }

  if (categories.length === 0) {
    return (
      <Input
        disabled
        value=""
        placeholder="Nenhuma categoria disponível para este membro"
      />
    );
  }

  const categoryOptions = categories.map((category) => {
    const isDisabled = disabledCategoryValues.has(category.value);
    const label = formatCategoryLabel(category, kind);

    return {
      value: category.value,
      label: isDisabled ? `${label} · Já lançado` : label,
      disabled: isDisabled,
    };
  });

  return (
    <AdminTableSelectInput
      fieldKey={`${kind}-${memberId}-category`}
      mode={currentEntryId ? "edit" : "create"}
      options={categoryOptions}
      placeholder="Selecione uma categoria"
      value={value}
      onChange={onChange}
    />
  );
}

function NoteInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <textarea
      value={value}
      placeholder="Observação opcional sobre este lançamento"
      onChange={(event) => onChange(event.target.value)}
      className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring/50"
    />
  );
}

function getCountryLabel(member: Doc<"members">) {
  if (!member.delegatedCountry) {
    return "Sem país";
  }

  const country = getCountryByCode(member.delegatedCountry);

  return `${country?.name ?? member.delegatedCountry} (${member.delegatedCountry})`;
}

function buildMemberMetadata({
  members,
  committees,
}: {
  members: Doc<"members">[];
  committees: Pick<Doc<"committees">, "_id" | "theme">[];
}) {
  const committeeLabelById: Record<string, string> = {};
  const memberCountryById: Record<string, string> = {};
  const memberDetailsById: Record<string, string> = {};
  const memberLabelById: Record<string, string> = {};
  const memberNameById: Record<string, string> = {};
  const memberTypeById: Record<string, Doc<"members">["type"]> = {};
  const memberOptions: AdminTableSelectOption[] = [];

  for (const committee of committees) {
    committeeLabelById[committee._id] = committee.theme;
  }

  for (const member of members) {
    const countryLabel = getCountryLabel(member);
    const details = [member.tuitionId, countryLabel].filter(Boolean).join(" · ");

    memberCountryById[member._id] = countryLabel;
    memberDetailsById[member._id] = details;
    memberLabelById[member._id] = `${member.name} · ${countryLabel}`;
    memberNameById[member._id] = member.name;
    memberTypeById[member._id] = member.type;
    memberOptions.push({
      value: member._id,
      label: member.tuitionId
        ? `${member.name} (${member.tuitionId}) · ${countryLabel}`
        : `${member.name} · ${countryLabel}`,
    });
  }

  return {
    committeeLabelById,
    memberCountryById,
    memberDetailsById,
    memberLabelById,
    memberNameById,
    memberOptions,
    memberTypeById,
  };
}

function enrichEntryRows({
  entries,
  committeeLabelById,
  memberCountryById,
  memberDetailsById,
  memberNameById,
  members,
}: {
  entries: Doc<"gradingEntries">[];
  committeeLabelById: Record<string, string>;
  memberCountryById: Record<string, string>;
  memberDetailsById: Record<string, string>;
  memberNameById: Record<string, string>;
  members: Doc<"members">[];
}): GradingEntryRow[] {
  const memberById = new Map(members.map((member) => [member._id, member]));

  return entries.map((entry) => {
    const member = memberById.get(entry.member);
    const memberCommittee = member?.committee
      ? (committeeLabelById[member.committee] ?? member.committee)
      : "-";

    return {
      ...entry,
      memberName: memberNameById[entry.member] ?? entry.member,
      memberCountry: memberCountryById[entry.member] ?? "-",
      memberDetails: memberDetailsById[entry.member] ?? "-",
      memberCommittee,
    };
  });
}

function buildMemberSummaries({
  members,
  rows,
  metadata,
}: {
  members: Doc<"members">[];
  rows: GradingEntryRow[];
  metadata: MemberMetadata;
}): MemberSummary[] {
  return members
    .map((member) => {
      const entries = rows.filter((entry) => entry.member === member._id);

      return {
        member,
        name: metadata.memberNameById[member._id] ?? member.name,
        details: metadata.memberDetailsById[member._id] ?? "-",
        country: metadata.memberCountryById[member._id] ?? "-",
        committee: member.committee
          ? (metadata.committeeLabelById[member.committee] ?? member.committee)
          : "Sem comitê",
        entries,
      };
    })
    .sort((leftMember, rightMember) =>
      leftMember.name.localeCompare(rightMember.name, "pt-BR", {
        sensitivity: "base",
      }),
    );
}

function getKindLabel(kind: GradingEntryKind) {
  return kind === "grade" ? "Pontuação" : "Dedução";
}

function getSignedAmountLabel(entry: Pick<GradingEntryRow, "kind" | "amount">) {
  const prefix = entry.kind === "grade" ? "+" : "-";

  return `${prefix}${formatAmount(entry.amount)}`;
}

function getEntryCategoryLabel(entry: Pick<GradingEntryRow, "kind" | "category">) {
  return (
    getCategoryDefinition(entry.kind, entry.category)?.label ?? entry.category
  );
}

function getEntryColumns({
  kind,
  entries,
  memberTypeById,
  memberOptions,
  categoryLabel,
  graderType,
  isAdmin,
  showAdminLinks,
}: {
  kind: GradingEntryKind;
  entries: GradingEntryRow[];
  memberTypeById: Record<string, Doc<"members">["type"]>;
  memberOptions: AdminTableSelectOption[];
  categoryLabel: string;
  graderType: GradingMemberType | undefined;
  isAdmin: boolean;
  showAdminLinks: boolean;
}): AdminTableColumn<GradingEntryRow>[] {
  return [
    {
      key: "member",
      label: "Membro",
      formSelectOptions: memberOptions,
      formSelectPlaceholder: "Selecione um membro",
      render: (entry) => {
        const content = (
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{entry.memberName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {entry.memberDetails}
            </span>
          </span>
        );

        if (!showAdminLinks) {
          return content;
        }

        return (
          <Link
            to="/admin/members"
            search={{ _id: entry.member }}
            className="block"
          >
            {content}
          </Link>
        );
      },
    },
    {
      key: "memberCommittee",
      label: "Comitê",
      showInForm: false,
      hiddenByDefault: true,
    },
    {
      key: "category",
      label: "Categoria",
      formLabel: categoryLabel,
      render: (entry) => {
        const category = getCategoryDefinition(entry.kind, entry.category);

        return category?.label ?? entry.category;
      },
      formRender: ({ value, values, onChange, row }) => (
        <CategorySelectInput
          kind={kind}
          memberId={values.member}
          memberTypeById={memberTypeById}
          entries={entries}
          currentEntryId={row?._id}
          graderType={graderType}
          isAdmin={isAdmin}
          value={value}
          onChange={onChange}
        />
      ),
    },
    {
      key: "_creationTime",
      label: "Criado em",
      showInForm: false,
      render: (entry) => formatCreatedAt(entry._creationTime),
    },
    {
      key: "amount",
      label: "Pontos",
      formLabel: kind === "deduction" ? "Valor da dedução" : "Pontos",
      render: (entry) => formatAmount(entry.amount),
      formRender: ({ value, values, onChange }) => {
        const category = values.category
          ? getCategoryDefinition(kind, values.category)
          : undefined;

        return (
          <AmountInput
            value={value}
            maxAmount={category?.maxAmount}
            defaultToMax={kind === "deduction"}
            onChange={onChange}
          />
        );
      },
    },
    {
      key: "note",
      label: "Observação",
      hiddenByDefault: true,
      render: (entry) => entry.note ?? "-",
      formRender: ({ value, onChange }) => (
        <NoteInput value={value} onChange={onChange} />
      ),
    },
  ];
}

function EntryEditorForm({
  kind,
  member,
  memberTypeById,
  entries,
  currentEntry,
  graderType,
  isAdmin,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  kind: GradingEntryKind;
  member: Doc<"members">;
  memberTypeById: Record<string, Doc<"members">["type"]>;
  entries: GradingEntryRow[];
  currentEntry?: GradingEntryRow;
  graderType: GradingMemberType | undefined;
  isAdmin: boolean;
  submitLabel: string;
  onCancel?: () => void;
  onSubmit: (values: EntryFormValues) => Promise<boolean>;
}) {
  const [values, setValues] = useState({
    category: currentEntry?.category ?? "",
    amount: currentEntry ? String(currentEntry.amount) : "",
    note: currentEntry?.note ?? "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const category = values.category
    ? getCategoryDefinition(kind, values.category)
    : undefined;

  useEffect(() => {
    setValues({
      category: currentEntry?.category ?? "",
      amount: currentEntry ? String(currentEntry.amount) : "",
      note: currentEntry?.note ?? "",
    });
  }, [currentEntry, kind, member._id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const saved = await onSubmit({
        member: member._id,
        category: values.category,
        amount: values.amount,
        note: values.note,
      });

      if (saved && !currentEntry) {
        setValues({ category: "", amount: "", note: "" });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FieldGroup>
        <Field>
          <FieldLabel>
            {kind === "grade"
              ? "Categoria de pontuação"
              : "Categoria de dedução"}
          </FieldLabel>
          <CategorySelectInput
            kind={kind}
            memberId={member._id}
            memberTypeById={memberTypeById}
            entries={entries}
            currentEntryId={currentEntry?._id}
            graderType={graderType}
            isAdmin={isAdmin}
            value={values.category}
            onChange={(category) =>
              setValues((currentValues) => ({
                ...currentValues,
                category,
                amount: kind === "deduction" ? "" : currentValues.amount,
              }))
            }
          />
        </Field>

        <Field>
          <FieldLabel>
            {kind === "deduction" ? "Valor da dedução" : "Pontos"}
          </FieldLabel>
          <AmountInput
            value={values.amount}
            maxAmount={category?.maxAmount}
            defaultToMax={kind === "deduction"}
            onChange={(amount) =>
              setValues((currentValues) => ({ ...currentValues, amount }))
            }
          />
        </Field>

        <Field>
          <FieldLabel>Observação</FieldLabel>
          <NoteInput
            value={values.note}
            onChange={(note) =>
              setValues((currentValues) => ({ ...currentValues, note }))
            }
          />
        </Field>
      </FieldGroup>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {currentEntry ? (
            <Pencil data-icon="inline-start" />
          ) : (
            <PlusCircle data-icon="inline-start" />
          )}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function MemberSelectionTable({
  summaries,
  onSelect,
}: {
  summaries: MemberSummary[];
  onSelect: (memberId: Doc<"members">["_id"]) => void;
}) {
  const memberRows = summaries.map<MemberSelectionRow>((summary) => {
    const gradeTotal = summary.entries
      .filter((entry) => entry.kind === "grade")
      .reduce((total, entry) => total + entry.amount, 0);
    const deductionTotal = summary.entries
      .filter((entry) => entry.kind === "deduction")
      .reduce((total, entry) => total + entry.amount, 0);

    return {
      _id: summary.member._id,
      name: summary.name,
      details: summary.details,
      country: summary.country,
      committee: summary.committee,
      gradeTotal,
      deductionTotal,
      balance: gradeTotal - deductionTotal,
    };
  });
  const memberColumns: AdminTableColumn<MemberSelectionRow>[] = [
    {
      key: "name",
      label: "Membro",
      render: (member) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-semibold">{member.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {member.details}
          </span>
        </span>
      ),
    },
    {
      key: "country",
      label: "País representado",
    },
    {
      key: "committee",
      label: "Comitê",
    },
    {
      key: "gradeTotal",
      label: "Pontuação",
      hiddenByDefault: true,
      render: (member) => `+${formatAmount(member.gradeTotal)}`,
    },
    {
      key: "deductionTotal",
      label: "Deduções",
      hiddenByDefault: true,
      render: (member) => `-${formatAmount(member.deductionTotal)}`,
    },
    {
      key: "balance",
      label: "Saldo",
      hiddenByDefault: true,
      render: (member) => (
        <Badge variant={member.balance < 0 ? "destructive" : "secondary"}>
          {formatAmount(member.balance)}
        </Badge>
      ),
    },
  ];

  return (
    <DynamicTable
      columns={memberColumns}
      data={memberRows}
      rowKey="_id"
      openLabel="Abrir"
      onOpen={(member) => onSelect(member._id)}
    />
  );
}

function InlinePanel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3 rounded-md border border-input bg-background p-3">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-medium">{title}</h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function MemberEntryListInput({
  summary,
  onEdit,
  onDelete,
}: {
  summary: MemberSummary;
  onEdit: (entry: GradingEntryRow) => void;
  onDelete: (entry: GradingEntryRow) => Promise<boolean>;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-input bg-background p-3">
      {summary.entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum lançamento criado para este membro.
        </p>
      ) : (
        summary.entries.map((entry) => {
          const isDeduction = entry.kind === "deduction";

          return (
            <div
              key={entry._id}
              className="flex flex-col gap-3 rounded-md border border-border/70 bg-muted/20 p-3"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-wrap items-center gap-2 leading-6">
                  <Badge variant={isDeduction ? "destructive" : "secondary"}>
                    {getKindLabel(entry.kind)}
                  </Badge>
                  <span className="text-xs leading-5 text-muted-foreground">
                    {formatCreatedAt(entry._creationTime)}
                  </span>
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(entry)}
                  >
                    Editar
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="outline" size="sm">
                        Remover
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover lançamento?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação remove o lançamento da ficha do membro.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => void onDelete(entry)}
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <div className="min-w-0 rounded-md bg-background/60 px-3 py-2">
                <p className="text-sm font-medium leading-6 break-words">
                  {getEntryCategoryLabel(entry)}
                </p>
                <p className="text-xs leading-5 break-words text-muted-foreground">
                  {getSignedAmountLabel(entry)} ponto(s)
                  {entry.note ? ` · ${entry.note}` : ""}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

function EntryEditorDialog({
  summary,
  rows,
  metadata,
  graderType,
  isAdmin,
  entry,
  open,
  onOpenChange,
  onCreateEntry,
  onUpdateEntry,
}: {
  summary: MemberSummary;
  rows: GradingEntryRow[];
  metadata: MemberMetadata;
  graderType: GradingMemberType | undefined;
  isAdmin: boolean;
  entry: GradingEntryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateEntry: (
    kind: GradingEntryKind,
    values: EntryFormValues,
  ) => Promise<boolean>;
  onUpdateEntry: (
    entry: GradingEntryRow,
    values: EntryFormValues,
  ) => Promise<boolean>;
}) {
  const title = entry ? "Editar lançamento" : "Adicionar lançamento";
  const description = entry
    ? "Ajuste a categoria, os pontos ou a observação deste registro."
    : "Escolha se o próximo registro aumenta ou desconta a pontuação.";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {entry ? (
          <EntryEditorForm
            kind={entry.kind}
            member={summary.member}
            memberTypeById={metadata.memberTypeById}
            entries={rows}
            graderType={graderType}
            isAdmin={isAdmin}
            currentEntry={entry}
            submitLabel="Salvar alterações"
            onCancel={() => onOpenChange(false)}
            onSubmit={async (values) => {
              const updated = await onUpdateEntry(entry, values);

              if (updated) {
                onOpenChange(false);
              }

              return updated;
            }}
          />
        ) : (
          <Tabs defaultValue="grade" className="gap-4">
            <TabsList>
              <TabsTrigger value="grade">
                <PlusCircle data-icon="inline-start" />
                Pontuação
              </TabsTrigger>
              <TabsTrigger value="deduction">
                <MinusCircle data-icon="inline-start" />
                Dedução
              </TabsTrigger>
            </TabsList>
            <TabsContent value="grade">
              <EntryEditorForm
                kind="grade"
                member={summary.member}
                memberTypeById={metadata.memberTypeById}
                entries={rows}
                graderType={graderType}
                isAdmin={isAdmin}
                submitLabel="Adicionar pontuação"
                onCancel={() => onOpenChange(false)}
                onSubmit={async (values) => {
                  const created = await onCreateEntry("grade", values);

                  if (created) {
                    onOpenChange(false);
                  }

                  return created;
                }}
              />
            </TabsContent>
            <TabsContent value="deduction">
              <EntryEditorForm
                kind="deduction"
                member={summary.member}
                memberTypeById={metadata.memberTypeById}
                entries={rows}
                graderType={graderType}
                isAdmin={isAdmin}
                submitLabel="Adicionar dedução"
                onCancel={() => onOpenChange(false)}
                onSubmit={async (values) => {
                  const created = await onCreateEntry("deduction", values);

                  if (created) {
                    onOpenChange(false);
                  }

                  return created;
                }}
              />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MemberSelectionTab({
  summaries,
  rows,
  metadata,
  graderType,
  isAdmin,
  selectedMemberId,
  onSelectMember,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
}: {
  summaries: MemberSummary[];
  rows: GradingEntryRow[];
  metadata: MemberMetadata;
  graderType: GradingMemberType | undefined;
  isAdmin: boolean;
  selectedMemberId: Doc<"members">["_id"] | null;
  onSelectMember: (memberId: Doc<"members">["_id"] | null) => void;
  onCreateEntry: (
    kind: GradingEntryKind,
    values: EntryFormValues,
  ) => Promise<boolean>;
  onUpdateEntry: (
    entry: GradingEntryRow,
    values: EntryFormValues,
  ) => Promise<boolean>;
  onDeleteEntry: (entry: GradingEntryRow) => Promise<boolean>;
}) {
  const selectedSummary = selectedMemberId
    ? summaries.find((summary) => summary.member._id === selectedMemberId) ?? null
    : null;

  return (
    <section className="flex flex-col gap-4">
      <MemberSelectionTable summaries={summaries} onSelect={onSelectMember} />

      <MemberGradingSheet
        summary={selectedSummary}
        rows={rows}
        metadata={metadata}
        graderType={graderType}
        isAdmin={isAdmin}
        open={selectedSummary !== null}
        onOpenChange={(open) => {
          if (!open) {
            onSelectMember(null);
          }
        }}
        onCreateEntry={onCreateEntry}
        onUpdateEntry={onUpdateEntry}
        onDeleteEntry={onDeleteEntry}
      />
    </section>
  );
}

function MemberGradingSheet({
  summary,
  rows,
  metadata,
  graderType,
  isAdmin,
  open,
  onOpenChange,
  onCreateEntry,
  onUpdateEntry,
  onDeleteEntry,
}: {
  summary: MemberSummary | null;
  rows: GradingEntryRow[];
  metadata: MemberMetadata;
  graderType: GradingMemberType | undefined;
  isAdmin: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateEntry: (
    kind: GradingEntryKind,
    values: EntryFormValues,
  ) => Promise<boolean>;
  onUpdateEntry: (
    entry: GradingEntryRow,
    values: EntryFormValues,
  ) => Promise<boolean>;
  onDeleteEntry: (entry: GradingEntryRow) => Promise<boolean>;
}) {
  const [editorEntry, setEditorEntry] = useState<GradingEntryRow | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setEditorEntry(null);
      setIsEditorOpen(false);
    }
  }, [open, summary?.member._id]);

  if (!summary) {
    return <Sheet open={open} onOpenChange={onOpenChange} />;
  }

  async function handleDelete(entry: GradingEntryRow) {
    const deleted = await onDeleteEntry(entry);

    if (deleted && editorEntry?._id === entry._id) {
      setEditorEntry(null);
      setIsEditorOpen(false);
    }

    return deleted;
  }

  function handleOpenCreate() {
    setEditorEntry(null);
    setIsEditorOpen(true);
  }

  function handleOpenEdit(entry: GradingEntryRow) {
    setEditorEntry(entry);
    setIsEditorOpen(true);
  }

  function handleEditorOpenChange(nextOpen: boolean) {
    setIsEditorOpen(nextOpen);

    if (!nextOpen) {
      setEditorEntry(null);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setEditorEntry(null);
          setIsEditorOpen(false);
        }

        onOpenChange(nextOpen);
      }}
    >
      <SheetContent
        side="right"
        className="w-full gap-0 overflow-y-auto border-border/70 bg-card p-0 sm:max-w-3xl"
      >
        <SheetHeader className="border-b border-border/70 px-6 py-4">
          <SheetTitle className="text-lg font-semibold tracking-tight">
            {summary.name}
          </SheetTitle>
          <SheetDescription>
            {summary.details} · {summary.committee}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 py-4 sm:px-6">
          <InlinePanel
            title="Linha do tempo"
            description="Pontuações e deduções aparecem juntas, com ações rápidas para adicionar, editar e remover."
          >
            <div className="flex justify-center rounded-md border border-input bg-background p-3">
              <Button type="button" variant="outline" onClick={handleOpenCreate}>
                Adicionar lançamento
              </Button>
            </div>
            <MemberEntryListInput
              summary={summary}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          </InlinePanel>

          <EntryEditorDialog
            summary={summary}
            rows={rows}
            metadata={metadata}
            graderType={graderType}
            isAdmin={isAdmin}
            entry={editorEntry}
            open={isEditorOpen}
            onOpenChange={handleEditorOpenChange}
            onCreateEntry={onCreateEntry}
            onUpdateEntry={onUpdateEntry}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LoadingPanel({
  title,
  description,
}: Pick<GradingManagementPanelProps, "title" | "description">) {
  return (
    <PageShell>
      <PageHeader title={title} description={description} />
      <Card>
        <CardContent className="flex flex-col gap-3">
          <Skeleton className="h-9 w-full max-w-sm" />
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </PageShell>
  );
}

function RestrictedPanel({
  restrictedTitle,
  restrictedDescription,
}: Pick<
  GradingManagementPanelProps,
  "restrictedTitle" | "restrictedDescription"
>) {
  return (
    <PageShell className="mx-auto w-full max-w-3xl">
      <Card className="border-dashed bg-card/70">
        <CardHeader>
          <CardTitle>{restrictedTitle}</CardTitle>
          <CardDescription>{restrictedDescription}</CardDescription>
        </CardHeader>
      </Card>
    </PageShell>
  );
}

export function GradingManagementPanel({
  title,
  description,
  restrictedTitle,
  restrictedDescription,
  showAdminLinks = false,
}: GradingManagementPanelProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<
    Doc<"members">["_id"] | null
  >(null);
  const manageData = useQuery(api.grading.getManageData);
  const entryCreate = useMutation(api.grading.create);
  const entryUpdate = useMutation(api.grading.update);
  const entryDelete = useMutation(api.grading.purge);

  if (manageData === undefined) {
    return <LoadingPanel title={title} description={description} />;
  }

  if (manageData === null) {
    return (
      <RestrictedPanel
        restrictedTitle={restrictedTitle}
        restrictedDescription={restrictedDescription}
      />
    );
  }

  const entries = manageData.entries;
  const members = manageData.members;
  const committees = manageData.committees;
  const graderType = manageData.currentMember.type as GradingMemberType;
  const isAdmin = manageData.isAdmin;
  const metadata = buildMemberMetadata({ members, committees });
  const rows = enrichEntryRows({
    entries,
    members,
    committeeLabelById: metadata.committeeLabelById,
    memberCountryById: metadata.memberCountryById,
    memberDetailsById: metadata.memberDetailsById,
    memberNameById: metadata.memberNameById,
  });
  const memberSummaries = buildMemberSummaries({ members, rows, metadata });
  const grades = rows.filter((entry) => entry.kind === "grade");
  const deductions = rows.filter((entry) => entry.kind === "deduction");
  const scopeLabel = manageData.isCommitteeScoped
    ? committees.map((committee) => committee.theme).join(", ") ||
      "nenhum comitê atribuído"
    : "todos os comitês disponíveis";

  const gradeColumns = getEntryColumns({
    kind: "grade",
    entries: rows,
    memberTypeById: metadata.memberTypeById,
    memberOptions: metadata.memberOptions,
    categoryLabel: "Categoria de pontuação",
    graderType,
    isAdmin,
    showAdminLinks,
  });
  const deductionColumns = getEntryColumns({
    kind: "deduction",
    entries: rows,
    memberTypeById: metadata.memberTypeById,
    memberOptions: metadata.memberOptions,
    categoryLabel: "Categoria de dedução",
    graderType,
    isAdmin,
    showAdminLinks,
  });

  function resolveEntryAmount(
    kind: GradingEntryKind,
    category: string | null,
    value: string | undefined,
  ) {
    const amount = parseAmount(value);

    if (amount === null && kind === "deduction" && category) {
      return getCategoryDefinition("deduction", category)?.maxAmount ?? null;
    }

    return amount;
  }

  function validateEntryValues({
    entryId,
    kind,
    member,
    category,
    amount,
  }: {
    entryId?: Doc<"gradingEntries">["_id"];
    kind: GradingEntryKind;
    member: Doc<"members">["_id"] | null;
    category: string | null;
    amount: number | null;
  }) {
    if (!member || !category) {
      toast.error("Preencha membro e categoria para salvar o lançamento.");
      return false;
    }

    const memberType = metadata.memberTypeById[member];
    const allowedCategories = getAllowedCategoriesForMemberAndGraderType(
      kind,
      memberType,
      graderType,
      isAdmin,
    );
    const categoryDefinition = allowedCategories.find(
      (allowedCategory) => allowedCategory.value === category,
    );

    if (!memberType || !categoryDefinition) {
      toast.error("Selecione uma categoria disponível para este membro.");
      return false;
    }

    const duplicateEntry = rows.find(
      (entry) =>
        entry._id !== entryId &&
        entry.member === member &&
        entry.kind === kind &&
        entry.category === category,
    );

    if (duplicateEntry) {
      toast.error(duplicateGradingEntryMessage);
      return false;
    }

    if (amount === null) {
      toast.error("Informe os pontos para salvar o lançamento.");
      return false;
    }

    if (amount > categoryDefinition.maxAmount) {
      toast.error(
        `O máximo desta categoria é ${formatAmount(categoryDefinition.maxAmount)} ponto(s).`,
      );
      return false;
    }

    return true;
  }

  async function createEntry(
    kind: GradingEntryKind,
    values: EntryFormValues,
  ) {
    const member = normalizeRequiredString(values.member) as
      | Doc<"members">["_id"]
      | null;
    const category = normalizeRequiredString(values.category);
    const amount = resolveEntryAmount(kind, category, values.amount);

    if (!validateEntryValues({ kind, member, category, amount })) {
      return false;
    }

    try {
      const created = await entryCreate({
        member: member as Doc<"members">["_id"],
        kind,
        category: category as string,
        amount: amount as number,
        note: normalizeOptionalString(values.note),
      });

      if (created === true) {
        toast.success("Lançamento criado com sucesso.");
        return true;
      }

      return false;
    } catch (error) {
      toast.error(
        getMutationErrorMessage(error, "Não foi possível criar o lançamento."),
      );
      return false;
    }
  }

  async function updateEntry(
    entry: GradingEntryRow,
    values: EntryFormValues,
  ) {
    const member = normalizeRequiredString(values.member) as
      | Doc<"members">["_id"]
      | null;
    const category = normalizeRequiredString(values.category);
    const amount = resolveEntryAmount(entry.kind, category, values.amount);

    if (
      !validateEntryValues({
        entryId: entry._id,
        kind: entry.kind,
        member,
        category,
        amount,
      })
    ) {
      return false;
    }

    try {
      const updated = await entryUpdate({
        id: entry._id,
        member: member as Doc<"members">["_id"],
        kind: entry.kind,
        category: category as string,
        amount: amount as number,
        note: normalizeOptionalString(values.note),
      });

      if (updated === true) {
        toast.success("Lançamento atualizado com sucesso.");
        return true;
      }

      return false;
    } catch (error) {
      toast.error(
        getMutationErrorMessage(error, "Não foi possível atualizar o lançamento."),
      );
      return false;
    }
  }

  async function deleteEntry(entry: GradingEntryRow) {
    try {
      const deleted = await entryDelete({ id: entry._id });

      if (deleted === true) {
        toast.success("Lançamento excluído com sucesso.");
        return true;
      }

      return false;
    } catch {
      toast.error("Não foi possível excluir o lançamento.");
      return false;
    }
  }

  return (
    <PageShell className="gap-3 md:gap-4">
      <PageHeader title={title} description={description} />

      <Tabs defaultValue="members" className="gap-4">
        <div className="flex justify-center">
          <TabsList className="h-auto flex-wrap rounded-xl bg-muted/70 p-1">
            <TabsTrigger value="members" className="px-3 py-1.5">
              <Users data-icon="inline-start" />
              Por membro
            </TabsTrigger>
            <TabsTrigger value="separated" className="px-3 py-1.5">
              <ListChecks data-icon="inline-start" />
              Visão separada
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="max-w-xl" aria-live="polite">
          <Card>
            <CardHeader>
              <CardTitle>Escopo</CardTitle>
              <CardDescription>Comitês disponíveis para lançamento.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm font-medium text-muted-foreground">
              {scopeLabel}
            </CardContent>
          </Card>
        </div>

        <TabsContent value="members">
          <MemberSelectionTab
            summaries={memberSummaries}
            rows={rows}
            metadata={metadata}
            graderType={graderType}
            isAdmin={isAdmin}
            selectedMemberId={selectedMemberId}
            onSelectMember={setSelectedMemberId}
            onCreateEntry={createEntry}
            onUpdateEntry={updateEntry}
            onDeleteEntry={deleteEntry}
          />
        </TabsContent>

        <TabsContent value="separated" className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold tracking-tight">Pontuações</h2>
              <p className="text-sm text-muted-foreground">
                Lance pontos positivos para os membros disponíveis no seu escopo.
              </p>
            </div>
            <DynamicTable
              columns={gradeColumns}
              data={grades}
              searchParamKey="_id"
              onCreate={(values) => createEntry("grade", values)}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
            />
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold tracking-tight">Deduções</h2>
              <p className="text-sm text-muted-foreground">
                Registre perdas de pontos com histórico auditável de alterações.
              </p>
            </div>
            <DynamicTable
              columns={deductionColumns}
              data={deductions}
              searchParamKey="_id"
              onCreate={(values) => createEntry("deduction", values)}
              onUpdate={updateEntry}
              onDelete={deleteEntry}
            />
          </section>
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
