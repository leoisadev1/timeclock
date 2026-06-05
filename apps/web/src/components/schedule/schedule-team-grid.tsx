import { EmployeeAvatar } from "@/components/employee-avatar";
import {
  formatDayColumnHeader,
  isTodayIso,
  SCHEDULE_DAYS,
  type ScheduleDay,
} from "@/components/schedule/date-utils";
import { ScheduleShiftCard } from "@/components/schedule/schedule-shift-card";
import { calculateShiftHours } from "@/lib/timeclock-adapter";
import type { Employee, Shift } from "@/lib/timeclock-types";
import { cn } from "@timeclock/ui/lib/utils";
import { EyeIcon } from "lucide-react";
import type { ReactNode } from "react";

const TEAM_COLUMN_WIDTH = "13rem";
const DAY_COLUMN_WIDTH = "9.5rem";
const CELL_HEIGHT = "7.75rem";

type WeekDate = { day: ScheduleDay; iso: string };

type ScheduleTeamGridProps = {
  weekDates: WeekDate[];
  employees: Employee[];
  shifts: Shift[];
  onCellClick: (employee?: Employee, day?: ScheduleDay) => void;
  onEditShift: (shift: Shift) => void;
  onDuplicateShift: (shift: Shift) => void;
  onDeleteShift: (shiftId: string) => void;
};

export function ScheduleTeamGrid({
  weekDates,
  employees,
  shifts,
  onCellClick,
  onEditShift,
  onDuplicateShift,
  onDeleteShift,
}: ScheduleTeamGridProps) {
  return (
    <div className="overflow-x-auto bg-card">
      <div className="min-w-max">
        <div
          className="grid border-b border-border bg-card"
          style={{ gridTemplateColumns: `${TEAM_COLUMN_WIDTH} repeat(7, ${DAY_COLUMN_WIDTH})` }}
        >
          <div className="border-r border-border bg-muted/20" />
          {weekDates.map(({ day, iso }) => {
            const today = isTodayIso(iso);
            return (
              <div
                key={day}
                className={cn(
                  "flex h-14 flex-col items-center justify-center border-r border-border px-2 text-center last:border-r-0",
                  today && "bg-primary/8",
                )}
              >
                <p
                  className={cn(
                    "text-xs font-bold tracking-wide",
                    today ? "text-primary" : "text-foreground",
                  )}
                >
                  {formatDayColumnHeader(iso, day)}
                </p>
                <p className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                  {dayTotal(shifts, day).toFixed(1)}h
                </p>
              </div>
            );
          })}
        </div>

        {employees.map((employee, rowIndex) => (
          <div
            key={employee.id}
            className={cn(
              "grid border-b border-border last:border-b-0",
              rowIndex % 2 === 1 ? "bg-muted/10" : "bg-card",
            )}
            style={{ gridTemplateColumns: `${TEAM_COLUMN_WIDTH} repeat(7, ${DAY_COLUMN_WIDTH})` }}
          >
            <div
              className="flex items-center border-r border-border px-3 py-2"
              style={{ height: CELL_HEIGHT }}
            >
              <TeamRowLabel employee={employee} shifts={shifts} />
            </div>

            {SCHEDULE_DAYS.map((day) => {
              const iso = weekDates.find((entry) => entry.day === day)?.iso ?? "";
              const today = isTodayIso(iso);
              const cellShiftsList = cellShifts(shifts, day, employee);
              const empty = cellShiftsList.length === 0;

              return (
                <ScheduleCell
                  key={day}
                  today={today}
                  empty={empty}
                  onClick={() => onCellClick(employee, day)}
                >
                  {cellShiftsList.map((shift) => (
                    <ScheduleShiftCard
                      key={shift.id}
                      shift={shift}
                      employee={employee}
                      compact
                      onEdit={() => onEditShift(shift)}
                      onDuplicate={() => onDuplicateShift(shift)}
                      onDelete={() => onDeleteShift(shift.id)}
                    />
                  ))}
                </ScheduleCell>
              );
            })}
          </div>
        ))}

        <div
          className="sticky bottom-0 grid border-t border-border bg-muted/40 shadow-[0_-4px_16px_rgba(0,0,0,0.35)] backdrop-blur-sm"
          style={{ gridTemplateColumns: `${TEAM_COLUMN_WIDTH} repeat(7, ${DAY_COLUMN_WIDTH})` }}
        >
          <div className="flex h-12 items-center border-r border-border px-3 text-xs font-semibold text-muted-foreground">
            Daily totals
          </div>
          {SCHEDULE_DAYS.map((day) => {
            const hours = dayTotal(shifts, day);
            return (
              <div
                key={day}
                className="flex h-12 items-center justify-center border-r border-border text-xs font-semibold tabular-nums text-muted-foreground last:border-r-0"
              >
                {hours.toFixed(2)}h
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ScheduleCell({
  children,
  today,
  empty,
  onClick,
}: {
  children: ReactNode;
  today: boolean;
  empty: boolean;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      style={{ height: CELL_HEIGHT }}
      className={cn(
        "group/cell relative box-border border-r border-border p-2 last:border-r-0 transition-colors hover:bg-muted/20",
        empty && "schedule-cell-hatch",
        today && !empty && "bg-primary/8",
        today && empty && "ring-1 ring-inset ring-primary/25",
      )}
    >
      <div className="flex h-full flex-col items-stretch justify-start gap-1.5">{children}</div>
      {empty ? (
        <div className="pointer-events-none absolute inset-1 flex items-center justify-center opacity-0 transition-opacity group-hover/cell:opacity-100">
          <span className="rounded-md bg-card/90 px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border">
            Add shift
          </span>
        </div>
      ) : null}
    </div>
  );
}

function TeamRowLabel({ employee, shifts }: { employee: Employee; shifts: Shift[] }) {
  const hours = employeeTotal(shifts, employee);
  const label = employee.firstName ?? employee.name.split(" ")[0] ?? employee.name;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <EmployeeAvatar
        name={employee.name}
        avatarUrl={employee.avatarUrl}
        avatarColor={employee.avatarColor}
        initials={employee.initials}
        employeeId={employee.id}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {label}{" "}
          <span className="font-medium text-muted-foreground">({hours.toFixed(2)}h)</span>
        </p>
      </div>
      <EyeIcon className="size-4 shrink-0 text-muted-foreground/35" />
    </div>
  );
}

function cellShifts(shifts: Shift[], day: string, employee?: Employee) {
  return shifts.filter((s) =>
    s.day === day && (employee ? s.employeeId === employee.id : !s.employeeId),
  );
}

function employeeTotal(shifts: Shift[], employee: Employee) {
  return shifts
    .filter((s) => s.employeeId === employee.id)
    .reduce((sum, s) => sum + calculateShiftHours(s), 0);
}

function dayTotal(shifts: Shift[], day: string) {
  return shifts.filter((s) => s.day === day).reduce((sum, s) => sum + calculateShiftHours(s), 0);
}
