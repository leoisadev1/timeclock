import {
  calculateShiftHours,
  getEmployees,
  warningLabel,
} from "@/lib/timeclock-adapter";
import type { TodayDashboard as TodayDashboardData, Timecard } from "@/lib/timeclock-types";
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
  onNavigate: (view: "schedule" | "reports") => void;
}

export function TodayDashboard({ data, onNavigate }: TodayDashboardProps) {
  const todaysShifts = data.schedule.shifts.filter((shift) => shift.day === "Thu");
  const totalHours = todaysShifts.reduce((sum, shift) => sum + calculateShiftHours(shift), 0);
  const employees = getEmployees(data.location.id);

  return (
    <div className="grid gap-4">
      <header className="grid gap-3 border-b pb-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">Today</h1>
            <Badge tone="primary">{data.location.name}</Badge>
            <Badge tone="neutral">{data.businessDate}</Badge>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Published schedule, live punch status, and attendance exceptions for the active location.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-30" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
          </span>
          Polling every 8s
        </div>
      </header>

      <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Published shifts"
          value={todaysShifts.length}
          detail={`${totalHours.toFixed(1)} scheduled hours`}
          icon={Clock3Icon}
          tone="neutral"
        />
        <Metric
          label="Clocked in"
          value={data.clockedIn.length}
          detail="Working now"
          icon={UserCheckIcon}
          tone="success"
        />
        <Metric
          label="On break"
          value={data.onBreak.length}
          detail="Break in progress"
          icon={CoffeeIcon}
          tone="warning"
        />
        <Metric
          label="Exceptions"
          value={data.lateOrNoShow.length + data.unscheduledClockIns.length}
          detail="Late, no-show, unscheduled"
          icon={AlertTriangleIcon}
          tone="danger"
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <div className="min-w-0 border">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h2 className="text-sm font-medium">Schedule and attendance</h2>
            <Button variant="outline" size="sm" onClick={() => onNavigate("schedule")}>
              Schedule <ArrowRightIcon />
            </Button>
          </div>
          <div className="grid divide-y">
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
                  className="grid gap-3 px-3 py-3 sm:grid-cols-[160px_minmax(0,1fr)_140px]"
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
                      {!card && employee ? (
                        <Badge tone="danger">No show watch</Badge>
                      ) : null}
                    </div>
                  </div>
                  <StatusBadge timecard={card} hasEmployee={Boolean(employee)} />
                </div>
              );
            })}
          </div>
        </div>

        <aside className="grid gap-4">
          <StatusRail title="Scheduled, not clocked in" icon={UserMinusIcon}>
            {data.scheduledNotClockedIn.length ? (
              data.scheduledNotClockedIn.map((employee) => (
                <PersonLine key={employee.id} name={employee.name} detail={employee.position} />
              ))
            ) : (
              <EmptyLine label="All scheduled employees have activity." />
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

          <div className="border p-3">
            <h2 className="text-sm font-medium">Quick links</h2>
            <div className="mt-3 grid gap-2">
              <Button variant="outline" onClick={() => onNavigate("schedule")}>
                Review next week
              </Button>
              <Button variant="outline" onClick={() => onNavigate("reports")}>
                Open reports
              </Button>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: number;
  detail: string;
  icon: typeof Clock3Icon;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const iconClass = {
    neutral: "text-foreground",
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-destructive",
  }[tone];

  const leftBorderClass = {
    neutral: "border-l-border",
    success: "border-l-emerald-500",
    warning: "border-l-amber-500",
    danger: "border-l-destructive",
  }[tone];

  return (
    <div className={`border border-l-4 p-3 ${leftBorderClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={`size-4 ${iconClass}`} strokeWidth={1.8} />
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
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
    <div className="border">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Icon className="size-4 text-muted-foreground" strokeWidth={1.8} />
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function PersonLine({ name, detail }: { name: string; detail: string }) {
  return (
    <div className="px-3 py-2">
      <p className="text-xs font-medium">{name}</p>
      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function EmptyLine({ label }: { label: string }) {
  return <p className="px-3 py-3 text-xs text-muted-foreground">{label}</p>;
}
