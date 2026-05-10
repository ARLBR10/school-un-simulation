"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";

import {
  DynamicTable,
  type AdminTableColumn,
  type AdminTableSelectOption,
} from "@/components/admin/DynamicTable";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
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

type GradingManagementPanelProps = {
  title: string;
  description: string;
  restrictedTitle: string;
  restrictedDescription: string;
  showAdminLinks?: boolean;
};

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

function AmountInput({
  value,
  maxAmount,
  onChange,
}: {
  value: string;
  maxAmount?: number;
  onChange: (value: string) => void;
}) {
  if (maxAmount !== undefined) {
    const parsedValue = parseAmount(value) ?? 0;
    const sliderValue = Math.min(parsedValue, maxAmount);

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

function formatCategoryLabel(category: {
  label: string;
  maxAmount: number;
  day?: 1 | 2;
}) {
  const dayLabel = category.day ? `Dia ${category.day} · ` : "";

  return `${dayLabel}${category.label} (máx. ${formatAmount(category.maxAmount)})`;
}

function CategorySelectInput({
  kind,
  memberId,
  memberTypeById,
  graderType,
  isAdmin,
  value,
  onChange,
}: {
  kind: GradingEntryKind;
  memberId: string | undefined;
  memberTypeById: Record<string, Doc<"members">["type"]>;
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

  return (
    <Select
      key={`${kind}-${memberId}-${value || "empty"}`}
      value={value || undefined}
      onValueChange={onChange}
    >
      <SelectTrigger className="w-full rounded-md border-input bg-background px-3 text-foreground shadow-sm hover:bg-background dark:bg-background data-[size=default]:h-10">
        <SelectValue placeholder="Selecione uma categoria" />
      </SelectTrigger>
      <SelectContent>
        {categories.map((category) => (
          <SelectItem key={category.value} value={category.value}>
            {formatCategoryLabel(category)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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

function getEntryColumns({
  kind,
  memberTypeById,
  memberOptions,
  categoryLabel,
  graderType,
  isAdmin,
  showAdminLinks,
}: {
  kind: GradingEntryKind;
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
          <Link href={`/admin/members?_id=${entry.member}`} className="block">
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
      formRender: ({ value, values, onChange }) => (
        <CategorySelectInput
          kind={kind}
          memberId={values.member}
          memberTypeById={memberTypeById}
          graderType={graderType}
          isAdmin={isAdmin}
          value={value}
          onChange={onChange}
        />
      ),
    },
    {
      key: "amount",
      label: "Pontos",
      render: (entry) => formatAmount(entry.amount),
      formRender: ({ value, values, onChange }) => {
        const category = values.category
          ? getCategoryDefinition(kind, values.category)
          : undefined;

        return (
          <AmountInput
            value={value}
            maxAmount={category?.maxAmount}
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
  const grades = rows.filter((entry) => entry.kind === "grade");
  const deductions = rows.filter((entry) => entry.kind === "deduction");
  const totalGrades = grades.reduce((total, grade) => total + grade.amount, 0);
  const totalDeductions = deductions.reduce(
    (total, deduction) => total + deduction.amount,
    0,
  );
  const netTotal = totalGrades - totalDeductions;
  const scopeLabel = manageData.isCommitteeScoped
    ? committees.map((committee) => committee.theme).join(", ") ||
      "nenhum comitê atribuído"
    : "todos os comitês disponíveis";

  const gradeColumns = getEntryColumns({
    kind: "grade",
    memberTypeById: metadata.memberTypeById,
    memberOptions: metadata.memberOptions,
    categoryLabel: "Categoria de pontuação",
    graderType,
    isAdmin,
    showAdminLinks,
  });
  const deductionColumns = getEntryColumns({
    kind: "deduction",
    memberTypeById: metadata.memberTypeById,
    memberOptions: metadata.memberOptions,
    categoryLabel: "Categoria de dedução",
    graderType,
    isAdmin,
    showAdminLinks,
  });

  function validateEntryValues({
    kind,
    member,
    category,
    amount,
  }: {
    kind: GradingEntryKind;
    member: Doc<"members">["_id"] | null;
    category: string | null;
    amount: number | null;
  }) {
    if (!member || !category || amount === null) {
      toast.error("Preencha membro, categoria e pontos para salvar o lançamento.");
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
    values: { member?: string; category?: string; amount?: string; note?: string },
  ) {
    const member = normalizeRequiredString(values.member) as
      | Doc<"members">["_id"]
      | null;
    const category = normalizeRequiredString(values.category);
    const amount = parseAmount(values.amount);

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
    } catch {
      toast.error("Não foi possível criar o lançamento.");
      return false;
    }
  }

  async function updateEntry(
    entry: GradingEntryRow,
    values: { member?: string; category?: string; amount?: string; note?: string },
  ) {
    const member = normalizeRequiredString(values.member) as
      | Doc<"members">["_id"]
      | null;
    const category = normalizeRequiredString(values.category);
    const amount = parseAmount(values.amount);

    if (!validateEntryValues({ kind: entry.kind, member, category, amount })) {
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
    } catch {
      toast.error("Não foi possível atualizar o lançamento.");
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
    <PageShell>
      <PageHeader title={title} description={description} />

      <div className="grid gap-4 md:grid-cols-4" aria-live="polite">
        <Card>
          <CardHeader>
            <CardTitle>Total de pontuações</CardTitle>
            <CardDescription>Soma dos pontos no seu escopo.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatAmount(totalGrades)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total de deduções</CardTitle>
            <CardDescription>Soma dos descontos aplicados.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatAmount(totalDeductions)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Saldo geral</CardTitle>
            <CardDescription>Pontuações menos deduções.</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatAmount(netTotal)}
          </CardContent>
        </Card>
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

      <section className="flex flex-col gap-3">
        <div className="space-y-1">
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
        <div className="space-y-1">
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
    </PageShell>
  );
}
