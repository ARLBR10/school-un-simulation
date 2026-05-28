"use client";

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Download } from "lucide-react";

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
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import type { ClassAttendanceReportData } from "@/convex/attendance";

export const Route = createFileRoute("/admin/class-attendance")({
  head: () => ({
    meta: [
      { title: "Presenças por Turma — Simulação da ONU" },
      {
        name: "description",
        content: "Acompanhe presença, atraso e ausência organizados por turma.",
      },
    ],
  }),
  component: ClassAttendancePage,
});

type ReportMember = ClassAttendanceReportData["members"][number];
type ReportStatus = ReportMember["status"];

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

function getClassName(member: Pick<ReportMember, "schoolClass">) {
  return member.schoolClass?.trim() || "Sem turma";
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

function ClassAttendancePage() {
  const [dateKey, setDateKey] = useState("");
  const reportData = useQuery(api.attendance.getClassReportData, {
    dateKey: dateKey || undefined,
  });
  const isLoading = reportData === undefined;
  const classGroups = new Map<string, ReportMember[]>();

  if (reportData) {
    for (const member of reportData.members) {
      const className = getClassName(member);
      const members = classGroups.get(className) ?? [];

      members.push(member);
      classGroups.set(className, members);
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

  return (
    <PageShell>
      <PageHeader
        title="Presenças por Turma"
        description="Veja todos os membros organizados por turma com status de presente, atrasado ou ausente. Membros sem registro no dia aparecem como ausentes."
        action={
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
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Selecione a data de presença que deve ser analisada.
          </CardDescription>
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

      {reportData === null ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Acesso administrativo necessário</CardTitle>
            <CardDescription>
              Esta página é reservada para administradores.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

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
          <div className="grid gap-4 md:grid-cols-4">
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
    </PageShell>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="gap-1">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
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
