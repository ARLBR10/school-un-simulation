"use client";

import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { CalendarIcon, CheckCircle2, CircleSlash, Clock3, Save } from "lucide-react";
import { toast } from "sonner";

import {
  DynamicTable,
  type AdminTableColumn,
} from "@/components/admin/DynamicTable";
import { PageHeader, PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import type { AttendanceCommitteeSummary } from "@/convex/attendance";
import { getCountryByCode } from "@/lib/country-list";
import { cn } from "@/lib/utils";

type AttendanceStatus = Doc<"attendanceEntries">["status"];
type AttendanceMember = AttendanceCommitteeSummary["members"][number];

type AttendanceMemberRow = {
  _id: Id<"members">;
  name: string;
  details: string;
  status: AttendanceStatus | undefined;
};

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
  unassigned: "Função não definida",
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
    member.delegatedCountry
      ? `${country?.name ?? member.delegatedCountry} (${member.delegatedCountry})`
      : null,
  ].filter(Boolean);

  return details.join(" · ");
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
  const late = members.filter(
    (member) => statuses[member._id] === "late",
  ).length;
  const pending = members.length - present - late - absent;

  return { present, late, absent, pending, total: members.length };
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
      <PopoverTrigger render={<Button type="button" variant="outline" />}>
        <CalendarIcon data-icon="inline-start" />
        {formatDateKey(dateKey)}
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:max-w-md">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-9 w-full" />
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-9 w-full sm:max-w-xs" />
          </div>

          <div className="overflow-hidden rounded-md border border-border">
            <div className="grid grid-cols-[1fr_1fr_auto] gap-4 border-b border-border bg-muted/30 p-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="hidden h-4 w-20 md:block" />
              <Skeleton className="h-4 w-20" />
            </div>
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`attendance-loading-${index}`}
                className="grid grid-cols-[1fr_1fr_auto] items-center gap-4 border-b border-border p-3 last:border-b-0"
              >
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-48 md:hidden" />
                </div>
                <Skeleton className="hidden h-4 w-48 md:block" />
                <Skeleton className="h-8 w-44" />
              </div>
            ))}
          </div>
        </div>
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

function StatusToggle({
  value,
  onChange,
  className,
  labelClassName,
}: {
  value: AttendanceStatus | undefined;
  onChange: (status: AttendanceStatus) => void;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <ToggleGroup
      value={value ? [value] : []}
      onValueChange={(nextValues) => {
        const nextValue = nextValues[0];

        if (
          nextValue === "present" ||
          nextValue === "late" ||
          nextValue === "absent"
        ) {
          onChange(nextValue);
        }
      }}
      variant="outline"
      size="sm"
      className={cn("ml-auto grid grid-cols-3", className)}
    >
      <ToggleGroupItem
        value="present"
        aria-label="Marcar presente"
        className={cn(
          value === "present" &&
            "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-600/90 hover:text-white data-pressed:bg-emerald-600 data-pressed:text-white",
        )}
      >
        <CheckCircle2 data-icon="inline-start" />
        <span className={labelClassName}>Presente</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="late"
        aria-label="Marcar atraso"
        className={cn(
          value === "late" &&
            "border-yellow-500 bg-yellow-500 text-yellow-950 hover:bg-yellow-500/90 hover:text-yellow-950 data-pressed:bg-yellow-500 data-pressed:text-yellow-950",
        )}
      >
        <Clock3 data-icon="inline-start" />
        <span className={labelClassName}>Atraso</span>
      </ToggleGroupItem>
      <ToggleGroupItem
        value="absent"
        aria-label="Marcar ausente"
        className={cn(
          value === "absent" &&
            "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground data-pressed:bg-destructive data-pressed:text-destructive-foreground",
        )}
      >
        <CircleSlash data-icon="inline-start" />
        <span className={labelClassName}>Ausente</span>
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
  const [selectedCommitteeId, setSelectedCommitteeId] = useState("");
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

  const selectedCommittee = attendanceData
    ? attendanceData.committees.find(
        (committee) => committee._id === selectedCommitteeId,
      ) ?? attendanceData.committees[0]
    : undefined;
  const selectedCommitteeStats = selectedCommittee
    ? getStats({ members: selectedCommittee.members, statuses })
    : null;
  const canSaveSelectedCommittee = Boolean(
    selectedCommittee &&
      selectedCommitteeStats &&
      selectedCommittee.members.length > 0 &&
      selectedCommitteeStats.pending === 0 &&
      !isSaving,
  );
  const attendanceRows = selectedCommittee
    ? selectedCommittee.members.map<AttendanceMemberRow>((member) => ({
        _id: member._id,
        name: member.name,
        details: getMemberDetails(member) || "Sem detalhes",
        status: statuses[member._id],
      }))
    : [];
  const attendanceColumns: AdminTableColumn<AttendanceMemberRow>[] = [
    {
      key: "name",
      label: "Membro",
      render: (member) => {
        const content = (
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-semibold">{member.name}</span>
            <span className="truncate text-xs text-muted-foreground md:hidden">
              {member.details}
            </span>
          </span>
        );

        if (!showAdminLinks) {
          return content;
        }

        return (
          <Link
            to="/admin/members"
            search={{ _id: member._id }}
            className="block hover:underline"
          >
            {content}
          </Link>
        );
      },
    },
    {
      key: "details",
      label: "Detalhes",
      className: "hidden md:table-cell",
    },
    {
      key: "status",
      label: "Presença",
      className: "text-right [&>div]:overflow-visible [&>div]:text-clip",
      render: (member) => (
        <StatusToggle
          value={member.status}
          labelClassName="hidden lg:inline"
          onChange={(status) =>
            setStatuses((currentStatuses) => ({
              ...currentStatuses,
              [member._id]: status,
            }))
          }
        />
      ),
    },
  ];

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
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:max-w-md">
              <span className="text-sm font-medium">Comitê</span>
              <Select
                value={selectedCommittee?._id ?? ""}
                onValueChange={(nextValue) => {
                  setSelectedCommitteeId(nextValue ?? "");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um comitê" />
                </SelectTrigger>
                <SelectContent
                  alignItemWithTrigger={false}
                  className="max-w-[calc(100vw-2rem)] sm:max-w-md"
                >
                  <SelectGroup>
                    {attendanceData.committees.map((committee) => {
                      const stats = getStats({
                        members: committee.members,
                        statuses,
                      });

                      return (
                        <SelectItem
                          key={committee._id}
                          value={committee._id}
                          className="[&>span:last-child]:truncate"
                        >
                          {committee.theme} ({stats.present}/{stats.total})
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {selectedCommittee && selectedCommitteeStats ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-3 md:hidden">
                  {attendanceRows.map((member) => (
                    <Card key={member._id} size="sm">
                      <CardContent className="flex flex-col gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{member.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.details}
                          </p>
                        </div>
                        <StatusToggle
                          value={member.status}
                          className="w-full"
                          onChange={(status) =>
                            setStatuses((currentStatuses) => ({
                              ...currentStatuses,
                              [member._id]: status,
                            }))
                          }
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <DynamicTable
                  columns={attendanceColumns}
                  data={attendanceRows}
                  className="hidden md:flex"
                  rowKey="_id"
                  showColumnVisibility={false}
                  showPagination={false}
                />

                <div className="flex justify-end border-t border-border pt-4">
                  <Button
                    type="button"
                    onClick={() => handleSave(selectedCommittee)}
                    disabled={!canSaveSelectedCommittee}
                  >
                    <Save data-icon="inline-start" />
                    {isSaving ? "Salvando..." : "Salvar presenças"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </PageShell>
  );
}
