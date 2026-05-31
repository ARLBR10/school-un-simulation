"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { ClipboardList, Download, NotebookPen } from "lucide-react";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import type { ClassAttendanceReportData } from "@/convex/attendance";
import type { ClassGradingReportData } from "@/convex/grading";

export const Route = createFileRoute("/admin/class-utils")({
  head: () => ({
    meta: [
      { title: "Class Utils — Simulação da ONU" },
      {
        name: "description",
        content: "Acompanhe presenças e notas organizadas por turma.",
      },
    ],
  }),
  component: ClassUtilsPage,
});

type ReportMember = ClassAttendanceReportData["members"][number];
type ReportStatus = ReportMember["status"];
type GradingReportMember = ClassGradingReportData["members"][number];

const statusLabels: Record<ReportStatus, string> = {
  present: "Presente",
  late: "Atrasado",
  absent: "Ausente",
  unknown: "Desconhecido",
};

const statusBadgeClasses: Record<ReportStatus, string> = {
  present: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  late: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  absent: "border-red-500/30 bg-red-500/10 text-red-300",
  unknown: "border-muted-foreground/30 bg-muted/30 text-muted-foreground",
};

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
  photographer: "Fotógrafo",
};

function getClassName(member: Pick<ReportMember, "schoolClass">) {
  return member.schoolClass?.trim() || "Sem turma";
}

function getMemberTypeLabel(
  member: Pick<GradingReportMember, "type" | "pressRole">,
) {
  const typeLabel = memberTypeLabels[member.type];

  if (member.type === "press" && member.pressRole) {
    return `${typeLabel} - ${pressRoleLabels[member.pressRole]}`;
  }

  return typeLabel;
}

function getGradingScale(className: string) {
  return className.toLocaleUpperCase("pt-BR").startsWith("3ª SÉRIE") ? 2.5 : 1;
}

function getScaledGradingValue(
  value: number,
  className: string,
  memberType?: Doc<"members">["type"],
) {
  if (memberType && memberType !== "delegate") {
    return value / 2.5;
  }

  return value / getGradingScale(className);
}

function escapeCsvValue(value: string | number | undefined) {
  const stringValue = value === undefined ? "" : String(value);

  if (/[",\n\r;]/.test(stringValue)) {
    return `"${stringValue.replaceAll('"', '""')}"`;
  }

  return stringValue;
}

function downloadCsv(reportData: ClassAttendanceReportData) {
  const headers = [
    "Data",
    "Turma",
    "Nome",
    "Matricula",
    "Status",
    "Atualizado em",
  ];
  const rows = reportData.members.map((member) => [
    reportData.dateKey,
    getClassName(member),
    member.name,
    member.tuitionId,
    statusLabels[member.status],
    member.attendanceUpdatedAt
      ? new Date(member.attendanceUpdatedAt).toLocaleString("pt-BR")
      : undefined,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(";"))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `presencas-por-turma-${reportData.dateKey}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function formatNumber(value: number) {
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
}

function formatGradingValue(value: number) {
  return value === 0 ? "-" : formatNumber(value);
}

function downloadGradingCsv(reportData: ClassGradingReportData) {
  const headers = [
    "Turma",
    "Nome",
    "Matricula",
    "Total final",
  ];
  const rows = reportData.members.map((member) => {
    const className = getClassName(member);

    return [
      className,
      member.name,
      member.tuitionId,
      formatGradingValue(
        getScaledGradingValue(member.total, className, member.type),
      ),
    ];
  });
  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsvValue).join(";"))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "notas-por-turma.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function ClassUtilsPage() {
  const [dateKey, setDateKey] = useState("");
  const reportData = useQuery(api.attendance.getClassReportData, {
    dateKey: dateKey || undefined,
  });
  const gradingReportData = useQuery(api.grading.getClassReportData);
  const isLoading = reportData === undefined;
  const isGradingLoading = gradingReportData === undefined;
  const classGroups = new Map<string, ReportMember[]>();
  const gradingClassGroups = new Map<string, GradingReportMember[]>();

  if (reportData) {
    for (const member of reportData.members) {
      const className = getClassName(member);
      const members = classGroups.get(className) ?? [];

      members.push(member);
      classGroups.set(className, members);
    }
  }

  if (gradingReportData) {
    for (const member of gradingReportData.members) {
      const className = getClassName(member);
      const members = gradingClassGroups.get(className) ?? [];

      members.push(member);
      gradingClassGroups.set(className, members);
    }
  }

  const members = reportData?.members ?? [];
  const presentCount = members.filter(
    (member) => member.status === "present",
  ).length;
  const lateCount = members.filter((member) => member.status === "late").length;
  const absentCount = members.filter(
    (member) => member.status === "absent",
  ).length;
  const unknownCount = members.filter(
    (member) => member.status === "unknown",
  ).length;
  const gradingMembers = gradingReportData?.members ?? [];

  return (
    <PageShell>
      <PageHeader
        title="Class Utils"
        description="Veja presenças e notas consolidadas por turma."
      />

      {reportData === null || gradingReportData === null ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Acesso administrativo necessário</CardTitle>
            <CardDescription>
              Esta página é reservada para administradores.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Tabs defaultValue="attendance" className="gap-4">
        <TabsList className="mx-auto h-11 p-1">
          <TabsTrigger className="h-9 px-4 text-base" value="attendance">
            <ClipboardList className="size-5" data-icon="inline-start" />
            Presenças
          </TabsTrigger>
          <TabsTrigger className="h-9 px-4 text-base" value="grading">
            <NotebookPen className="size-5" data-icon="inline-start" />
            Notas
          </TabsTrigger>
        </TabsList>

        <TabsContent className="flex flex-col gap-4" value="attendance">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Presenças por turma</CardTitle>
                <CardDescription>
                  Selecione a data de presença que deve ser analisada.
                </CardDescription>
              </div>
              <Button
                type="button"
                disabled={!reportData || members.length === 0}
                onClick={() => {
                  if (reportData) {
                    downloadCsv(reportData);
                  }
                }}
              >
                <Download data-icon="inline-start" />
                Exportar CSV
              </Button>
            </CardHeader>
            <CardContent className="grid gap-2 sm:max-w-xs">
              <label className="text-sm font-medium" htmlFor="attendance-date">
                Data
              </label>
              <Input
                id="attendance-date"
                type="date"
                value={reportData?.dateKey && !dateKey ? reportData.dateKey : dateKey}
                onChange={(event) => setDateKey(event.target.value)}
              />
            </CardContent>
          </Card>

          {isLoading ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Carregando presenças</CardTitle>
                <CardDescription>
                  Buscando membros e registros de presença.
                </CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {reportData ? (
            <>
              <div className="grid gap-4 md:grid-cols-5">
                <SummaryCard label="Membros" value={members.length} />
                <SummaryCard label="Presentes" value={presentCount} />
                <SummaryCard label="Atrasados" value={lateCount} />
                <SummaryCard label="Ausentes" value={absentCount} />
                <SummaryCard label="Desconhecidos" value={unknownCount} />
              </div>

              <div className="flex flex-col gap-4">
                {[...classGroups.entries()].map(([className, classMembers]) => (
                  <ClassAttendanceCard
                    key={className}
                    classNameLabel={className}
                    members={classMembers}
                  />
                ))}
              </div>
            </>
          ) : null}
        </TabsContent>

        <TabsContent className="flex flex-col gap-4" value="grading">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Notas por turma</CardTitle>
                <CardDescription>
                  Veja a soma de pontos, deduções e total final por membro.
                </CardDescription>
              </div>
              <Button
                type="button"
                disabled={!gradingReportData || gradingMembers.length === 0}
                onClick={() => {
                  if (gradingReportData) {
                    downloadGradingCsv(gradingReportData);
                  }
                }}
              >
                <Download data-icon="inline-start" />
                Exportar CSV
              </Button>
            </CardHeader>
          </Card>

          {isGradingLoading ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Carregando notas</CardTitle>
                <CardDescription>Buscando membros e lançamentos de notas.</CardDescription>
              </CardHeader>
            </Card>
          ) : null}

          {gradingReportData ? (
            <>
              <div className="grid gap-4 sm:max-w-xs">
                <SummaryCard label="Membros" value={gradingMembers.length} />
              </div>

              <div className="flex flex-col gap-4">
                {[...gradingClassGroups.entries()].map(([className, classMembers]) => (
                  <ClassGradingCard
                    key={className}
                    classNameLabel={className}
                    members={classMembers}
                  />
                ))}
              </div>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{formatNumber(value)}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ClassAttendanceCard({
  classNameLabel,
  members,
}: {
  classNameLabel: string;
  members: ReportMember[];
}) {
  const presentCount = members.filter(
    (member) => member.status === "present",
  ).length;
  const lateCount = members.filter((member) => member.status === "late").length;
  const absentCount = members.filter(
    (member) => member.status === "absent",
  ).length;
  const unknownCount = members.filter(
    (member) => member.status === "unknown",
  ).length;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle>{classNameLabel}</CardTitle>
            <CardDescription>{members.length} membros nesta turma.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={statusBadgeClasses.present}>
              {presentCount} presentes
            </Badge>
            <Badge variant="outline" className={statusBadgeClasses.late}>
              {lateCount} atrasados
            </Badge>
            <Badge variant="outline" className={statusBadgeClasses.absent}>
              {absentCount} ausentes
            </Badge>
            <Badge variant="outline" className={statusBadgeClasses.unknown}>
              {unknownCount} desconhecidos
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Comitê</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => (
              <TableRow key={member._id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell>{member.tuitionId ?? "-"}</TableCell>
                <TableCell>{memberTypeLabels[member.type]}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusBadgeClasses[member.status]}>
                    {statusLabels[member.status]}
                  </Badge>
                </TableCell>
                <TableCell>{member.committeeTheme ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ClassGradingCard({
  classNameLabel,
  members,
}: {
  classNameLabel: string;
  members: GradingReportMember[];
}) {
  const points = members.reduce(
    (sum, member) =>
      sum + getScaledGradingValue(member.points, classNameLabel, member.type),
    0,
  );
  const deductions = members.reduce(
    (sum, member) =>
      sum + getScaledGradingValue(member.deductions, classNameLabel, member.type),
    0,
  );
  const total = members.reduce(
    (sum, member) =>
      sum + getScaledGradingValue(member.total, classNameLabel, member.type),
    0,
  );

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle>{classNameLabel}</CardTitle>
            <CardDescription>{members.length} membros nesta turma.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
            >
              {formatGradingValue(points)} pontos
            </Badge>
            <Badge
              variant="outline"
              className="border-red-500/30 bg-red-500/10 text-red-300"
            >
              {formatGradingValue(deductions)} deduções
            </Badge>
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary"
            >
              {formatGradingValue(total)} total
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Matrícula</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Comitê</TableHead>
              <TableHead className="text-right">Pontos</TableHead>
              <TableHead className="text-right">Deduções</TableHead>
              <TableHead className="text-right">Total final</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const className = getClassName(member);

              return (
                <TableRow key={member._id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell>{member.tuitionId ?? "-"}</TableCell>
                  <TableCell>{getMemberTypeLabel(member)}</TableCell>
                  <TableCell>{member.committeeTheme ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    {formatGradingValue(
                      getScaledGradingValue(member.points, className, member.type),
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatGradingValue(
                      getScaledGradingValue(
                        member.deductions,
                        className,
                        member.type,
                      ),
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatGradingValue(
                      getScaledGradingValue(member.total, className, member.type),
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
