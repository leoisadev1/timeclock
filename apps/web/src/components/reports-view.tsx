import type { LocationId } from "@/lib/timeclock-types";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  Clock3Icon,
  FileClockIcon,
  PencilLineIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

type AttendanceStatus = "on_time" | "late" | "early" | "no_show" | "unscheduled";
type TimecardStatus = "clocked_in" | "on_break" | "clocked_out";
type PunchSource = "station" | "employee_web" | "manager_edit";

type DailyReport = {
  locationName: string;
  timezone: string;
  businessDate: string;
  totals: {
    scheduledHours: number;
    actualHours: number;
    varianceHours: number;
    breakMinutes: number;
    editedTimecards: number;
    late: number;
    unscheduled: number;
  };
  rows: Array<{
    employeeId: string;
    displayName: string;
    role: "admin" | "manager" | "employee";
    positionName: string | null;
    scheduledHours: number;
    actualHours: number;
    varianceHours: number;
    breakMinutes: number;
    statuses: AttendanceStatus[];
    timecards: Array<{
      timecardId: string;
      shiftId: string | null;
      clockInAt: number;
      clockOutAt: number | null;
      status: TimecardStatus;
      attendanceStatus: AttendanceStatus;
      actualHours: number;
      breakMinutes: number;
      source: PunchSource;
      edited: boolean;
      editNote: string | null;
    }>;
    scheduledShifts: Array<{
      shiftId: string;
      positionName: string;
      startAt: number;
      endAt: number;
      scheduledHours: number;
    }>;
  }>;
};

type WeeklyReport = {
  locationName: string;
  timezone: string;
  weekStartDate: string;
  totals: {
    scheduledHours: number;
    actualHours: number;
    varianceHours: number;
    breakMinutes: number;
    late: number;
    early: number;
    unscheduled: number;
    editedTimecards: number;
  };
  rows: Array<{
    employeeId: string;
    displayName: string;
    role: "admin" | "manager" | "employee";
    scheduledHours: number;
    actualHours: number;
    varianceHours: number;
    breakMinutes: number;
    late: number;
    early: number;
    unscheduled: number;
    editedTimecards: number;
  }>;
};

type ReportViewMode = "daily" | "weekly";

const panelClass = "overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border";

export function ReportsView({
  locationId: _locationId,
  dailyReport,
  weeklyReport,
}: {
  locationId: LocationId;
  dailyReport?: DailyReport | null;
  weeklyReport?: WeeklyReport | null;
}) {
  const [view, setView] = useState<ReportViewMode>("daily");

  return (
    <div className="grid gap-5">
      <header className="flex animate-in fade-in-0 flex-wrap items-start justify-between gap-3 duration-200">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {dailyReport?.locationName ?? weeklyReport?.locationName ?? "Reports"}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">Timecard reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Seeded schedules, punches, breaks, and corrections reconciled by employee.
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-muted p-1 ring-1 ring-border">
          <Button
            variant={view === "daily" ? "default" : "ghost"}
            size="sm"
            className="rounded-full transition-colors duration-150"
            onClick={() => setView("daily")}
          >
            Daily
          </Button>
          <Button
            variant={view === "weekly" ? "default" : "ghost"}
            size="sm"
            className="rounded-full transition-colors duration-150"
            onClick={() => setView("weekly")}
          >
            Weekly
          </Button>
        </div>
      </header>

      {view === "daily" ? (
        <DailyReportView report={dailyReport} />
      ) : (
        <WeeklyReportView report={weeklyReport} />
      )}
    </div>
  );
}

function DailyReportView({ report }: { report?: DailyReport | null }) {
  if (!report) {
    return <EmptyReport label="Daily report is loading." />;
  }

  const rowsWithPunches = report.rows.filter((row) => row.timecards.length > 0).length;
  const rowsMissingPunches = report.rows.filter(
    (row) => row.scheduledShifts.length > 0 && row.timecards.length === 0,
  ).length;

  return (
    <div className="grid gap-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 fill-mode-both">
      <section className={panelClass}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDaysIcon className="size-4 text-muted-foreground" />
              {formatDate(report.businessDate, report.timezone)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {rowsWithPunches} with punches · {rowsMissingPunches} scheduled without punches
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={report.totals.late > 0 ? "danger" : "neutral"}>
              {report.totals.late} late
            </Badge>
            <Badge tone={report.totals.unscheduled > 0 ? "warning" : "neutral"}>
              {report.totals.unscheduled} unscheduled
            </Badge>
            <Badge tone={report.totals.editedTimecards > 0 ? "warning" : "neutral"}>
              {report.totals.editedTimecards} edited
            </Badge>
          </div>
        </div>
        <ReportStats
          scheduledHours={report.totals.scheduledHours}
          actualHours={report.totals.actualHours}
          varianceHours={report.totals.varianceHours}
          breakMinutes={report.totals.breakMinutes}
        />
      </section>

      <section className={panelClass}>
        <div className="grid divide-y divide-border/60">
          {report.rows.map((row) => (
            <DailyEmployeeRow key={row.employeeId} row={row} timezone={report.timezone} />
          ))}
        </div>
      </section>
    </div>
  );
}

function DailyEmployeeRow({
  row,
  timezone,
}: {
  row: DailyReport["rows"][number];
  timezone: string;
}) {
  const hasEditedPunch = row.timecards.some((timecard) => timecard.edited);
  const isMissingPunch = row.scheduledShifts.length > 0 && row.timecards.length === 0;
  const statuses =
    row.timecards.length > 0 ? row.timecards.map((timecard) => timecard.attendanceStatus) : [];

  return (
    <article className="grid gap-4 px-4 py-4 transition-colors duration-150 hover:bg-muted/20 lg:grid-cols-[220px_minmax(0,1fr)_220px]">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <Avatar name={row.displayName} id={row.employeeId} />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold">{row.displayName}</h2>
            <p className="text-xs text-muted-foreground">
              {row.positionName ?? roleLabel(row.role)}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {isMissingPunch ? <Badge tone="danger">No punches</Badge> : null}
          {Array.from(new Set(statuses)).map((status) => (
            <AttendanceBadge key={status} status={status} />
          ))}
          {hasEditedPunch ? <Badge tone="warning">Edited</Badge> : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ReportColumn title="Scheduled shifts" icon={Clock3Icon}>
          {row.scheduledShifts.length ? (
            row.scheduledShifts.map((shift) => (
              <LineItem
                key={shift.shiftId}
                primary={`${formatTime(shift.startAt, timezone)} - ${formatTime(shift.endAt, timezone)}`}
                secondary={`${shift.positionName} · ${shift.scheduledHours.toFixed(1)}h scheduled`}
              />
            ))
          ) : (
            <MutedLine label="No scheduled shift" />
          )}
        </ReportColumn>

        <ReportColumn title="Punches" icon={FileClockIcon}>
          {row.timecards.length ? (
            row.timecards.map((timecard) => (
              <LineItem
                key={timecard.timecardId}
                primary={`${formatTime(timecard.clockInAt, timezone)} - ${
                  timecard.clockOutAt ? formatTime(timecard.clockOutAt, timezone) : "Open"
                }`}
                secondary={`${statusLabel(timecard.status)} · ${timecard.actualHours.toFixed(1)}h actual · ${sourceLabel(timecard.source)}`}
                badge={<AttendanceBadge status={timecard.attendanceStatus} />}
                note={timecard.editNote}
              />
            ))
          ) : (
            <MutedLine label="No timecard recorded" />
          )}
        </ReportColumn>
      </div>

      <div className="grid grid-cols-2 gap-2 self-start text-sm">
        <MiniMetric label="Scheduled" value={`${row.scheduledHours.toFixed(1)}h`} />
        <MiniMetric label="Actual" value={`${row.actualHours.toFixed(1)}h`} />
        <MiniMetric
          label="Variance"
          value={`${row.varianceHours > 0 ? "+" : ""}${row.varianceHours.toFixed(1)}h`}
          valueClass={varianceClass(row.varianceHours)}
        />
        <MiniMetric label="Breaks" value={`${minutesToHours(row.breakMinutes)}`} />
      </div>
    </article>
  );
}

function WeeklyReportView({ report }: { report?: WeeklyReport | null }) {
  if (!report) {
    return <EmptyReport label="Weekly report is loading." />;
  }

  const weekEndDate = addDays(report.weekStartDate, 6);

  return (
    <div className="grid gap-4 animate-in fade-in-0 slide-in-from-bottom-1 duration-200 fill-mode-both">
      <section className={panelClass}>
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDaysIcon className="size-4 text-muted-foreground" />
              {formatDate(report.weekStartDate, report.timezone)} -{" "}
              {formatDate(weekEndDate, report.timezone)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Published seed schedule totals with seeded punch exceptions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={report.totals.late > 0 ? "danger" : "neutral"}>
              {report.totals.late} late
            </Badge>
            <Badge tone={report.totals.unscheduled > 0 ? "warning" : "neutral"}>
              {report.totals.unscheduled} unscheduled
            </Badge>
            <Badge tone={report.totals.editedTimecards > 0 ? "warning" : "neutral"}>
              {report.totals.editedTimecards} edited
            </Badge>
          </div>
        </div>
        <ReportStats
          scheduledHours={report.totals.scheduledHours}
          actualHours={report.totals.actualHours}
          varianceHours={report.totals.varianceHours}
          breakMinutes={report.totals.breakMinutes}
        />
      </section>

      <section className={panelClass}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold">Employee</th>
                <th className="px-4 py-3 text-xs font-semibold">Scheduled</th>
                <th className="px-4 py-3 text-xs font-semibold">Actual</th>
                <th className="px-4 py-3 text-xs font-semibold">Variance</th>
                <th className="px-4 py-3 text-xs font-semibold">Breaks</th>
                <th className="px-4 py-3 text-xs font-semibold">Exceptions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {report.rows.map((row) => (
                <tr
                  key={row.employeeId}
                  className="transition-colors duration-150 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={row.displayName} id={row.employeeId} />
                      <div>
                        <p className="font-medium">{row.displayName}</p>
                        <p className="text-xs text-muted-foreground">{roleLabel(row.role)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.scheduledHours.toFixed(1)}h</td>
                  <td className="px-4 py-3 tabular-nums">{row.actualHours.toFixed(1)}h</td>
                  <td
                    className={`px-4 py-3 font-semibold tabular-nums ${varianceClass(row.varianceHours)}`}
                  >
                    {row.varianceHours > 0 ? "+" : ""}
                    {row.varianceHours.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3 tabular-nums">{minutesToHours(row.breakMinutes)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.late > 0 ? <Badge tone="danger">{row.late} late</Badge> : null}
                      {row.early > 0 ? <Badge tone="warning">{row.early} early</Badge> : null}
                      {row.unscheduled > 0 ? (
                        <Badge tone="warning">{row.unscheduled} unscheduled</Badge>
                      ) : null}
                      {row.editedTimecards > 0 ? (
                        <Badge tone="warning">{row.editedTimecards} edited</Badge>
                      ) : null}
                      {row.late + row.early + row.unscheduled + row.editedTimecards === 0 ? (
                        <Badge tone="neutral">None</Badge>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ReportStats({
  scheduledHours,
  actualHours,
  varianceHours,
  breakMinutes,
}: {
  scheduledHours: number;
  actualHours: number;
  varianceHours: number;
  breakMinutes: number;
}) {
  return (
    <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
      <StatCell label="Scheduled" value={`${scheduledHours.toFixed(1)}h`} icon={Clock3Icon} />
      <StatCell label="Actual" value={`${actualHours.toFixed(1)}h`} icon={FileClockIcon} />
      <StatCell
        label="Variance"
        value={`${varianceHours > 0 ? "+" : ""}${varianceHours.toFixed(1)}h`}
        icon={AlertTriangleIcon}
        valueClass={varianceClass(varianceHours)}
      />
      <StatCell label="Breaks" value={minutesToHours(breakMinutes)} icon={PencilLineIcon} />
    </div>
  );
}

function StatCell({
  label,
  value,
  icon: Icon,
  valueClass,
}: {
  label: string;
  value: string;
  icon: typeof Clock3Icon;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
      <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className={`mt-1 text-2xl font-bold tracking-tight tabular-nums ${valueClass ?? ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

function ReportColumn({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Clock3Icon;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Icon className="size-3.5" />
        {title}
      </div>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function LineItem({
  primary,
  secondary,
  badge,
  note,
}: {
  primary: string;
  secondary: string;
  badge?: ReactNode;
  note?: string | null;
}) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold">{primary}</p>
        {badge}
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">{secondary}</p>
      {note ? <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{note}</p> : null}
    </div>
  );
}

function MiniMetric({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background/50 px-3 py-2">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className={`mt-1 font-semibold tabular-nums ${valueClass ?? ""}`}>{value}</p>
    </div>
  );
}

function AttendanceBadge({ status }: { status: AttendanceStatus }) {
  const tone =
    status === "late" || status === "no_show"
      ? "danger"
      : status === "unscheduled" || status === "early"
        ? "warning"
        : "success";
  return <Badge tone={tone}>{attendanceLabel(status)}</Badge>;
}

function EmptyReport({ label }: { label: string }) {
  return (
    <div className={`${panelClass} px-4 py-10 text-center text-sm text-muted-foreground`}>
      {label}
    </div>
  );
}

function MutedLine({ label }: { label: string }) {
  return <p className="text-xs text-muted-foreground">{label}</p>;
}

function Avatar({ name, id }: { name: string; id: string }) {
  return (
    <span
      className={`flex size-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${avatarColor(id)}`}
    >
      {initials(name)}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function avatarColor(seed: string) {
  const colors = [
    "bg-emerald-500",
    "bg-blue-500",
    "bg-violet-500",
    "bg-rose-500",
    "bg-teal-500",
    "bg-amber-500",
  ];
  const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return colors[total % colors.length] ?? colors[0];
}

function roleLabel(role: "admin" | "manager" | "employee") {
  if (role === "admin") return "Admin";
  if (role === "manager") return "Manager";
  return "Employee";
}

function statusLabel(status: TimecardStatus) {
  if (status === "clocked_in") return "Clocked in";
  if (status === "on_break") return "On break";
  return "Clocked out";
}

function sourceLabel(source: PunchSource) {
  if (source === "employee_web") return "Employee web";
  if (source === "manager_edit") return "Manager edit";
  return "Station";
}

function attendanceLabel(status: AttendanceStatus) {
  if (status === "on_time") return "On time";
  if (status === "no_show") return "No show";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function varianceClass(variance: number) {
  if (variance > 0) return "text-emerald-600 dark:text-emerald-400";
  if (variance < 0) return "text-destructive";
  return "";
}

function minutesToHours(minutes: number) {
  return `${(minutes / 60).toFixed(1)}h`;
}

function formatDate(iso: string, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${iso}T12:00:00Z`));
}

function formatTime(timestamp: number, timezone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
