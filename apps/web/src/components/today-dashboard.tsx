import { calculateShiftHours, getEmployees, warningLabel } from "@/lib/timeclock-adapter";
import type {
  Employee,
  TodayDashboard as TodayDashboardData,
  Timecard,
} from "@/lib/timeclock-types";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  Clock3Icon,
  CoffeeIcon,
  RadioIcon,
  UserCheckIcon,
  UserMinusIcon,
} from "lucide-react";
import type { ReactNode } from "react";

interface TodayDashboardProps {
  data: TodayDashboardData;
  employees?: Employee[];
  onNavigate: (view: "schedule" | "reports") => void;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const panelClass = "overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border";

export function TodayDashboard({
  data,
  employees: providedEmployees,
  onNavigate,
}: TodayDashboardProps) {
  const todayLabel =
    DAY_LABELS[new Date(`${data.businessDate}T00:00:00.000Z`).getUTCDay()] ?? "Mon";
  const todaysShifts = data.schedule.shifts.filter((shift) => shift.day === todayLabel);
  const totalHours = todaysShifts.reduce((sum, shift) => sum + calculateShiftHours(shift), 0);
  const employees = providedEmployees ?? getEmployees(data.location.id);

  return (
    <div className="grid gap-4">
      <section className={`${panelClass} animate-in fade-in-0 duration-200`}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {data.location.name}
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Today's attendance</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatBusinessDate(data.businessDate)} · {totalHours.toFixed(1)}h scheduled
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-40" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Updating
          </div>
        </div>

        <div className="grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
          <StatCell
            label="Published shifts"
            value={todaysShifts.length}
            detail={`${totalHours.toFixed(1)}h scheduled today`}
            icon={Clock3Icon}
          />
          <StatCell
            label="Clocked in"
            value={data.clockedIn.length}
            detail="Working now"
            icon={UserCheckIcon}
            accent="success"
          />
          <StatCell
            label="On break"
            value={data.onBreak.length}
            detail="Taking a break"
            icon={CoffeeIcon}
            accent="warning"
          />
          <StatCell
            label="Exceptions"
            value={data.lateOrNoShow.length + data.unscheduledClockIns.length}
            detail="Late, missing, or unscheduled"
            icon={AlertTriangleIcon}
            accent="danger"
          />
        </div>
      </section>

      <section className="grid animate-in fade-in-0 slide-in-from-bottom-1 gap-4 duration-200 fill-mode-both delay-75 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <div className={`min-w-0 ${panelClass}`}>
          <div className="flex items-center justify-between bg-muted/30 px-4 py-3">
            <h2 className="text-sm font-semibold">Today's schedule</h2>
            <Button variant="outline" size="sm" onClick={() => onNavigate("schedule")}>
              Edit schedule <ArrowRightIcon />
            </Button>
          </div>
          <div className="grid divide-y divide-border/60">
            {todaysShifts.map((shift) => {
              const employee = shift.employeeId
                ? employees.find((candidate) => candidate.id === shift.employeeId)
                : undefined;
              const warning = warningLabel(shift.warning);
              const card = shift.employeeId
                ? [...data.clockedIn, ...data.onBreak, ...data.clockedOut].find(
                    (timecard) => timecard.employeeId === shift.employeeId,
                  )
                : undefined;
              return (
                <div
                  key={shift.id}
                  className="grid gap-3 px-3 py-3 transition-colors duration-150 hover:bg-muted/20 sm:grid-cols-[160px_minmax(0,1fr)_140px]"
                >
                  <div>
                    <p className="text-xs font-semibold">
                      {shift.start} - {shift.end}
                    </p>
                    <p className="text-xs text-muted-foreground">{shift.position}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {employee ? (
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white ${employee.avatarColor}`}
                        >
                          {employee.initials}
                        </span>
                      ) : null}
                      <p className="truncate text-sm font-medium">
                        {employee?.name ?? "Open shift"}
                      </p>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {shift.overnight ? <Badge tone="info">Overnight</Badge> : null}
                      {warning ? <Badge tone="warning">{warning}</Badge> : null}
                      {card?.attendance === "late" ? <Badge tone="danger">Late</Badge> : null}
                      {!card && employee ? <Badge tone="danger">No clock-in yet</Badge> : null}
                    </div>
                  </div>
                  <StatusBadge timecard={card} hasEmployee={Boolean(employee)} />
                </div>
              );
            })}
          </div>
        </div>

        <aside className="grid gap-4">
          <StatusRail title="Not clocked in yet" icon={UserMinusIcon}>
            {data.scheduledNotClockedIn.length ? (
              data.scheduledNotClockedIn.map((employee) => (
                <PersonLine key={employee.id} name={employee.name} detail={employee.position} />
              ))
            ) : (
              <EmptyLine label="Everyone scheduled today has clocked in or checked out." />
            )}
          </StatusRail>

          <StatusRail title="Recent punches" icon={RadioIcon}>
            {data.recentEvents.map((event) => {
              const employee = employees.find((candidate) => candidate.id === event.employeeId);
              return (
                <PersonLine
                  key={event.id}
                  name={employee?.name ?? "Unknown employee"}
                  detail={`${event.action.replace("-", " ")} at ${event.time} via ${event.source.replace("_", " ")}`}
                />
              );
            })}
          </StatusRail>

          <div className={`${panelClass} p-4`}>
            <h2 className="text-sm font-semibold">Quick links</h2>
            <div className="mt-3 grid gap-2">
              <Button variant="outline" onClick={() => onNavigate("schedule")}>
                Build schedule
              </Button>
              <Button variant="outline" onClick={() => onNavigate("reports")}>
                Review timecards
              </Button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function formatBusinessDate(iso: string) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(new Date(`${iso}T12:00:00`));
}

function StatCell({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Clock3Icon;
  accent?: "success" | "warning" | "danger";
}) {
  const valueClass =
    accent === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : accent === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : accent === "danger"
          ? "text-destructive"
          : "text-foreground";

  return (
    <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 ${
          accent === "success"
            ? "text-emerald-600 dark:text-emerald-400"
            : accent === "warning"
              ? "text-amber-600 dark:text-amber-400"
              : accent === "danger"
                ? "text-destructive"
                : "text-muted-foreground"
        }`}
      >
        <Icon className="size-4" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold tabular-nums leading-none ${valueClass}`}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

function StatusBadge({ timecard, hasEmployee }: { timecard?: Timecard; hasEmployee: boolean }) {
  if (!hasEmployee) {
    return (
      <Badge tone="warning" className="w-fit self-start">
        Needs assignment
      </Badge>
    );
  }
  if (!timecard) {
    return (
      <Badge tone="danger" className="w-fit self-start">
        Not clocked in
      </Badge>
    );
  }
  if (timecard.status === "on-break") {
    return (
      <Badge tone="warning" className="w-fit self-start">
        On break
      </Badge>
    );
  }
  if (timecard.status === "clocked-in") {
    return (
      <Badge tone="success" className="w-fit self-start">
        Clocked in
      </Badge>
    );
  }
  return (
    <Badge tone="neutral" className="w-fit self-start">
      Clocked out
    </Badge>
  );
}

function StatusRail({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof RadioIcon;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border">
      <div className="flex items-center gap-2 bg-muted/30 px-4 py-3">
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.8} />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="divide-y divide-border/60 bg-card">{children}</div>
    </div>
  );
}

function PersonLine({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="px-3 py-2 transition-colors duration-150 hover:bg-muted/20">
      <p className="text-xs font-medium">{name}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function EmptyLine({ label }: { label: string }) {
  return <p className="px-3 py-3 text-xs text-muted-foreground">{label}</p>;
}
