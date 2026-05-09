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
import { Slider } from "@/components/ui/slider";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import {
  getAllowedCategoriesForMemberType,
  getCategoryDefinition,
} from "@/lib/grading-categories";

type GradingEntryKind = Doc<"gradingEntries">["kind"];

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
  value,
  onChange,
}: {
  kind: GradingEntryKind;
  memberId: string | undefined;
  memberTypeById: Record<string, Doc<"members">["type"]>;
  value: string;
  onChange: (value: string) => void;
}) {
  const memberType = memberId ? memberTypeById[memberId] : undefined;
  const categories = getAllowedCategoriesForMemberType(kind, memberType);

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
        placeholder="Nenhuma categoria disponível para este tipo de membro"
      />
    );
  }

  return (
    <Select key={`${kind}-${memberId}-${value || "empty"}`} value={value || undefined} onValueChange={onChange}>
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

function buildMemberOptions({
  members,
  entries,
}: {
  members: Doc<"members">[];
  entries: Doc<"gradingEntries">[];
}) {
  const memberLabelById: Record<string, string> = {};
  const memberTypeById: Record<string, Doc<"members">["type"]> = {};
  const memberOptions: AdminTableSelectOption[] = [];

  for (const member of members) {
    memberTypeById[member._id] = member.type;
    memberLabelById[member._id] = member.tuitionId
      ? `${member.name} (${member.tuitionId})`
      : member.name;
    memberOptions.push({
      value: member._id,
      label: memberLabelById[member._id],
    });
  }

  for (const entry of entries) {
    if (memberLabelById[entry.member]) {
      continue;
    }

    memberLabelById[entry.member] = entry.member;
    memberOptions.push({
      value: entry.member,
      label: entry.member,
    });
  }

  return { memberLabelById, memberOptions, memberTypeById };
}

function getEntryColumns({
  kind,
  memberLabelById,
  memberTypeById,
  memberOptions,
  categoryLabel,
}: {
  kind: GradingEntryKind;
  memberLabelById: Record<string, string>;
  memberTypeById: Record<string, Doc<"members">["type"]>;
  memberOptions: AdminTableSelectOption[];
  categoryLabel: string;
}): AdminTableColumn<Doc<"gradingEntries">>[] {
  return [
    {
      key: "member",
      label: "Membro",
      formSelectOptions: memberOptions,
      formSelectPlaceholder: "Selecione um membro",
      render: (entry) => (
        <Link href={`/admin/members?_id=${entry.member}`} className="font-semibold">
          {memberLabelById[entry.member] ?? entry.member}
        </Link>
      ),
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

export default function GradesPage() {
  const entriesData = useQuery(api.grading.getAll);
  const membersData = useQuery(api.members.getAll);
  const entryCreate = useMutation(api.grading.create);
  const entryUpdate = useMutation(api.grading.update);
  const entryDelete = useMutation(api.grading.purge);

  const entries = entriesData ?? [];
  const grades = entries.filter((entry) => entry.kind === "grade");
  const deductions = entries.filter((entry) => entry.kind === "deduction");
  const members = membersData ?? [];
  const { memberLabelById, memberOptions, memberTypeById } = buildMemberOptions({
    members,
    entries,
  });
  const totalGrades = grades.reduce((total, grade) => total + grade.amount, 0);
  const totalDeductions = deductions.reduce(
    (total, deduction) => total + deduction.amount,
    0,
  );
  const netTotal = totalGrades - totalDeductions;
  const isLoading = entriesData === undefined || membersData === undefined;

  const gradeColumns = getEntryColumns({
    kind: "grade",
    memberLabelById,
    memberTypeById,
    memberOptions,
    categoryLabel: "Categoria de pontuação",
  });
  const deductionColumns = getEntryColumns({
    kind: "deduction",
    memberLabelById,
    memberTypeById,
    memberOptions,
    categoryLabel: "Categoria de dedução",
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

    const memberType = memberTypeById[member];
    const categoryDefinition = getCategoryDefinition(kind, category);

    if (
      !memberType ||
      !categoryDefinition ||
      !categoryDefinition.memberTypes.includes(memberType)
    ) {
      toast.error("Selecione uma categoria disponível para o tipo deste membro.");
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

    if (!member || !category || amount === null) {
      toast.error("Preencha membro, categoria e pontos para criar o lançamento.");
      return false;
    }

    if (!validateEntryValues({ kind, member, category, amount })) {
      return false;
    }

    try {
      const created = await entryCreate({
        member,
        kind,
        category,
        amount,
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
    entry: Doc<"gradingEntries">,
    values: { member?: string; category?: string; amount?: string; note?: string },
  ) {
    const member = normalizeRequiredString(values.member) as
      | Doc<"members">["_id"]
      | null;
    const category = normalizeRequiredString(values.category);
    const amount = parseAmount(values.amount);

    if (!member || !category || amount === null) {
      toast.error("Preencha membro, categoria e pontos para salvar o lançamento.");
      return false;
    }

    if (!validateEntryValues({ kind: entry.kind, member, category, amount })) {
      return false;
    }

    try {
      const updated = await entryUpdate({
        id: entry._id,
        member,
        kind: entry.kind,
        category,
        amount,
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

  async function deleteEntry(entry: Doc<"gradingEntries">) {
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
      <PageHeader
        title="Notas"
        description="Registre pontuações e deduções dos membros da simulação."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total de pontuações</CardTitle>
            <CardDescription>Soma de todos os pontos lançados.</CardDescription>
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
      </div>

      <section className="flex flex-col gap-3">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Pontuações</h2>
          <p className="text-sm text-muted-foreground">
            Lance pontos positivos por participação, documentos ou desempenho.
          </p>
        </div>
        <DynamicTable
          columns={gradeColumns}
          data={grades}
          isLoading={isLoading}
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
            Registre perdas de pontos para manter o saldo final auditável.
          </p>
        </div>
        <DynamicTable
          columns={deductionColumns}
          data={deductions}
          isLoading={isLoading}
          searchParamKey="_id"
          onCreate={(values) => createEntry("deduction", values)}
          onUpdate={updateEntry}
          onDelete={deleteEntry}
        />
      </section>
    </PageShell>
  );
}
