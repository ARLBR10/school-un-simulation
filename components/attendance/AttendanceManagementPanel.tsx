"use client";

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarIcon,
  CheckCircle2,
  CircleSlash,
  Save,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { AttendanceCommitteeSummary } from "@/convex/attendance";
import { getCountryByCode } from "@/lib/country-list";
import { cn } from "@/lib/utils";

type AttendanceStatus = Doc<"attendanceEntries">["status"];
type AttendanceMember = AttendanceCommitteeSummary["members"][number];

type AttendanceManagementPanelProps = {
  title: string;
  description: string;
  restrictedTitle: string;
  restrictedDescription: string;
  showAdminLinks?: boolean;
  allowDateSelection?: boolean;
};

const memberTypeLabels: Record<AttendanceMember["type"], string> = {
  delegate: "Delegado",
  logistics: "Logística",
  press: "Imprensa",
  clerk: "Mesário",
  teacher: "Professor",
  admin: "Administrador",
};

function getTodayDateKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function formatDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-");

  if (!year || !month || !day) {
    return dateKey;
  }

  return `${day}/${month}/${year}`;
}

function getMemberDetails(member: AttendanceMember) {
  const country = member.delegatedCountry
    ? getCountryByCode(member.delegatedCountry)
    : null;
  const details = [
    memberTypeLabels[member.type],
    member.tuitionId ? `Matrícula ${member.tuitionId}` : null,
    member.delegatedCountry
      ? `${country?.name ?? member.delegatedCountry} (${member.delegatedCountry})`
      : null,
  ].filter(Boolean);

  return details.join(" · ");
}

function getVisibleMembers(committees: AttendanceCommitteeSummary[]) {
  const membersById = new Map<Id<"members">, AttendanceMember>();

  for (const committee of committees) {
    for (const member of committee.members) {
      membersById.set(member._id, member);
    }
  }

  return [...membersById.values()];
}

function getStats({
  members,
  statuses,
}: {
  members: AttendanceMember[];
  statuses: Record<string, AttendanceStatus | undefined>;
}) {
  const present = members.filter(
    (member) => statuses[member._id] === "present",
  ).length;
  const absent = members.filter(
    (member) => statuses[member._id] === "absent",
  ).length;
  const pending = members.length - present - absent;

  return { present, absent, pending, total: members.length };
}

function DatePicker({
  dateKey,
  onChange,
}: {
  dateKey: string;
  onChange: (dateKey: string) => void;
}) {
  const selectedDate = getDateFromKey(dateKey);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline">
          <CalendarIcon data-icon="inline-start" />
          {formatDateKey(dateKey)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              onChange(getDateKey(date));
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function AttendanceLoading() {
  return (
    <div className="rounded-xl border border-border p-4">
      <div className="flex flex-col gap-3">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={`attendance-loading-${index}`}
            className="flex items-center justify-between gap-4"
          >
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-9 w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}

function RestrictedState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StatusSummary({
  stats,
}: {
  stats: ReturnType<typeof getStats>;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" aria-live="polite">
      <Badge variant="outline">Total: {stats.total}</Badge>
      <Badge className="bg-emerald-600 text-white">Presentes: {stats.present}</Badge>
      <Badge variant="destructive">Ausentes: {stats.absent}</Badge>
      <Badge variant="outline">Pendentes: {stats.pending}</Badge>
    </div>
  );
}

function StatusToggle({
  value,
  onChange,
}: {
  value: AttendanceStatus | undefined;
  onChange: (status: AttendanceStatus) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value ?? ""}
      onValueChange={(nextValue) => {
        if (nextValue === "present" || nextValue === "absent") {
          onChange(nextValue);
        }
      }}
      variant="outline"
      size="sm"
      className="ml-auto"
    >
      <ToggleGroupItem
        value="present"
        aria-label="Marcar presente"
        className={cn(
          value === "present" &&
            "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-600/90 hover:text-white",
        )}
      >
        <CheckCircle2 data-icon="inline-start" />
        Presente
      </ToggleGroupItem>
      <ToggleGroupItem
        value="absent"
        aria-label="Marcar ausente"
        className={cn(
          value === "absent" &&
            "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground",
        )}
      >
        <CircleSlash data-icon="inline-start" />
        Ausente
      </ToggleGroupItem>
    </ToggleGroup>
  );
}

export function AttendanceManagementPanel({
  title,
  description,
  restrictedTitle,
  restrictedDescription,
  showAdminLinks = false,
  allowDateSelection = false,
}: AttendanceManagementPanelProps) {
  const [selectedDateKey, setSelectedDateKey] = useState(getTodayDateKey);
  const [statuses, setStatuses] = useState<
    Record<string, AttendanceStatus | undefined>
  >({});
  const [isSaving, setIsSaving] = useState(false);
  const attendanceData = useQuery(api.attendance.getManageData, {
    dateKey: selectedDateKey,
  });
  const saveStatuses = useMutation(api.attendance.saveStatuses);

  useEffect(() => {
    if (!attendanceData) {
      setStatuses({});
      return;
    }

    const nextStatuses: Record<string, AttendanceStatus> = {};

    for (const entry of attendanceData.entries) {
      nextStatuses[entry.member] = entry.status;
    }

    setStatuses(nextStatuses);
  }, [attendanceData?.dateKey, attendanceData?.entries]);

  const visibleMembers = attendanceData
    ? getVisibleMembers(attendanceData.committees)
    : [];
  const totalStats = getStats({ members: visibleMembers, statuses });

  async function handleSave(committee: AttendanceCommitteeSummary) {
    const isCommitteeComplete = committee.members.every(
      (member) => statuses[member._id],
    );

    if (!isCommitteeComplete) {
      toast.error("Marque todos os membros deste comitê antes de salvar.");
      return;
    }

    setIsSaving(true);

    try {
      const saved = await saveStatuses({
        committee: committee._id,
        dateKey: selectedDateKey,
        statuses: committee.members.map((member) => ({
          member: member._id,
          status: statuses[member._id] as AttendanceStatus,
        })),
      });

      if (saved === true) {
        toast.success(`Presenças de ${committee.theme} salvas em um único envio.`);
      } else {
        toast.error("Você não tem permissão para salvar estas presenças.");
      }
    } catch (error) {
      const message =
        error instanceof Error &&
        error.message.includes("attendance_incomplete_statuses")
          ? "Todos os membros precisam estar marcados antes de salvar."
          : "Não foi possível salvar as presenças.";

      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <PageShell>
      <PageHeader
        title={title}
        description={
          attendanceData
            ? `${description} Registro de ${formatDateKey(attendanceData.dateKey)}.`
            : description
        }
        action={
          allowDateSelection ? (
            <DatePicker dateKey={selectedDateKey} onChange={setSelectedDateKey} />
          ) : null
        }
      />

      {attendanceData === undefined ? <AttendanceLoading /> : null}

      {attendanceData === null ? (
        <RestrictedState
          title={restrictedTitle}
          description={restrictedDescription}
        />
      ) : null}

      {attendanceData && attendanceData.committees.length === 0 ? (
        <RestrictedState
          title="Nenhum comitê disponível"
          description="Vincule membros e equipes aos comitês antes de registrar presença."
        />
      ) : null}

      {attendanceData && attendanceData.committees.length > 0 ? (
        <div className="flex flex-col gap-4" aria-busy={isSaving}>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-background/50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <StatusSummary stats={totalStats} />
          </div>

          <Tabs defaultValue={attendanceData.committees[0]._id} className="gap-4">
            <TabsList className="mx-auto h-auto flex-wrap justify-center">
              {attendanceData.committees.map((committee) => {
                const stats = getStats({ members: committee.members, statuses });

                return (
                  <TabsTrigger key={committee._id} value={committee._id}>
                    <Users data-icon="inline-start" />
                    {committee.theme}
                    <span className="text-muted-foreground">
                      {stats.present}/{stats.total}
                    </span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {attendanceData.committees.map((committee) => {
              const stats = getStats({ members: committee.members, statuses });
              const canSaveCommittee =
                committee.members.length > 0 && stats.pending === 0 && !isSaving;

              return (
                <TabsContent
                  key={committee._id}
                  value={committee._id}
                  className="mt-0 flex flex-col gap-3"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold">{committee.theme}</h2>
                      <p className="text-sm text-muted-foreground">
                        {stats.present} presentes, {stats.absent} ausentes e {stats.pending} pendentes.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Membro</TableHead>
                          <TableHead className="hidden md:table-cell">Detalhes</TableHead>
                          <TableHead className="text-right">Presença</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {committee.members.map((member) => {
                          const memberName = showAdminLinks ? (
                            <Link
                              to="/admin/members"
                              search={{ _id: member._id }}
                              className="font-medium hover:underline"
                            >
                              {member.name}
                            </Link>
                          ) : (
                            <span className="font-medium">{member.name}</span>
                          );

                          return (
                            <TableRow key={`${committee._id}-${member._id}`}>
                              <TableCell>
                                <div className="flex min-w-0 flex-col gap-1">
                                  {memberName}
                                  <span className="text-xs text-muted-foreground md:hidden">
                                    {getMemberDetails(member) || "Sem detalhes"}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden text-muted-foreground md:table-cell">
                                {getMemberDetails(member) || "Sem detalhes"}
                              </TableCell>
                              <TableCell>
                                <StatusToggle
                                  value={statuses[member._id]}
                                  onChange={(status) =>
                                    setStatuses((currentStatuses) => ({
                                      ...currentStatuses,
                                      [member._id]: status,
                                    }))
                                  }
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="flex justify-end border-t border-border pt-4">
                    <Button
                      type="button"
                      onClick={() => handleSave(committee)}
                      disabled={!canSaveCommittee}
                    >
                      <Save data-icon="inline-start" />
                      {isSaving ? "Salvando..." : "Salvar presenças"}
                    </Button>
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      ) : null}
    </PageShell>
  );
}
