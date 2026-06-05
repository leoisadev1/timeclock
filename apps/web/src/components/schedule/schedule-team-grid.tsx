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
import { CalendarDaysIcon, CircleIcon, EyeIcon } from "lucide-react";

const TEAM_COLUMN_WIDTH = "minmax(13rem, 15rem)";
const DAY_COLUMN_WIDTH = "minmax(10.75rem, 1fr)";

type WeekDate = { day: ScheduleDay; iso: string };

type ScheduleTeamGridProps = {
  weekDates: WeekDate[];
  employees: Employee[];
  shifts: Shift[];
  openShiftCount: number;
  onCellClick: () => void;
  onEditShift: (shift: Shift) => void;
  onDuplicateShift: (shift: Shift) => void;
  onDeleteShift: (shiftId: string) => void;
};

export function ScheduleTeamGrid({
  weekDates,
  employees,
  shifts,
  openShiftCount,
  onCellClick,
  onEditShift,
  onDuplicateShift,
  onDeleteShift,
}: ScheduleTeamGridProps) {
  const rows: Array<Employee | undefined> = [...employees, undefined];
  const teamRows = rows.filter(Boolean).length;

  return (
    <div className="overflow-x-auto bg-card">
      <div className="min-w-[1220px]">
        <div
          className="grid border-b border-border bg-card"
          style={{ gridTemplateColumns: `${TEAM_COLUMN_WIDTH} repeat(7, ${DAY_COLUMN_WIDTH})` }}
        >
          <div className="border-r border-border px-4 py-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-muted-foreground">View by</span>
              <select className="h-9 rounded-md border border-border bg-muted/40 px-3 text-sm font-medium text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30">
                <option>First name</option>
                <option>Role</option>
                <option>Hours</option>
              </select>
            </label>
          </div>
          {weekDates.map(({ day, iso }) => {
            const today = isTodayIso(iso);
            return (
              <div
                key={day}
                className={cn(
                  "border-r border-border px-2 py-4 text-center last:border-r-0",
                  today && "bg-primary/8",
                )}
              >
                <p
                  className={cn(
                    "inline-flex rounded-full px-3 py-1 text-sm font-bold",
                    today
                      ? "border border-primary/50 text-primary"
                      : "text-foreground",
                  )}
                >
                  {formatDayColumnHeader(iso, day)}
                </p>
                <p className="mt-1 text-[11px] tabular-nums text-muted-foreground">
                  {dayTotal(shifts, day).toFixed(1)}h
                </p>
              </div>
            );
          })}
        </div>

        <div
          className="grid border-b border-border bg-card"
          style={{ gridTemplateColumns: `${TEAM_COLUMN_WIDTH} repeat(7, ${DAY_COLUMN_WIDTH})` }}
        >
          <div className="flex items-center gap-3 border-r border-border px-4 py-3 text-sm font-semibold text-foreground">
            <CalendarDaysIcon className="size-4 text-muted-foreground" />
            Events (0)
          </div>
          {weekDates.map(({ day }) => (
            <div
              key={day}
              className="schedule-cell-hatch min-h-12 border-r border-border last:border-r-0"
            />
          ))}
        </div>

        <div
          className="grid border-b border-border bg-card"
          style={{ gridTemplateColumns: `${TEAM_COLUMN_WIDTH} repeat(7, ${DAY_COLUMN_WIDTH})` }}
        >
          <div className="flex items-center gap-3 border-r border-border px-4 py-3">
            <CircleIcon className="size-4 fill-muted-foreground text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold text-foreground">Open shifts ({openShiftCount})</p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {openShiftHours(shifts).toFixed(2)} hours need coverage
              </p>
            </div>
          </div>
          {SCHEDULE_DAYS.map((day) => {
            const cellShiftsList = cellShifts(shifts, day, undefined);
            const empty = cellShiftsList.length === 0;
            return (
              <div
                key={day}
                role="button"
                tabIndex={0}
                onClick={onCellClick}
                className={cn(
                  "schedule-cell-interactive min-h-[4.5rem] border-r border-border p-1.5 last:border-r-0 hover:bg-muted/20",
                  empty && "schedule-cell-hatch",
                )}
              >
                <div className="relative grid gap-1.5">
                  {cellShiftsList.map((shift) => (
                    <ScheduleShiftCard
                      key={shift.id}
                      shift={shift}
                      compact
                      onEdit={() => onEditShift(shift)}
                      onDuplicate={() => onDuplicateShift(shift)}
                      onDelete={() => onDeleteShift(shift.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-b border-border bg-muted/35 px-4 py-2 text-sm font-bold text-muted-foreground">
          Team members ({teamRows})
        </div>

        {rows.map((employee, rowIndex) =>
          !employee ? null : (
            <div
              key={employee.id}
              className={cn(
                "grid border-b border-border last:border-b-0",
                rowIndex % 2 === 1 ? "bg-muted/15" : "bg-card",
              )}
              style={{ gridTemplateColumns: `${TEAM_COLUMN_WIDTH} repeat(7, ${DAY_COLUMN_WIDTH})` }}
            >
              <div className="border-r border-border px-4 py-3">
                <TeamRowLabel employee={employee} shifts={shifts} />
              </div>

              {SCHEDULE_DAYS.map((day) => {
                const iso = weekDates.find((entry) => entry.day === day)?.iso ?? "";
                const today = isTodayIso(iso);
                const cellShiftsList = cellShifts(shifts, day, employee);
                const empty = cellShiftsList.length === 0;

                return (
                  <div
                    key={day}
                    role="button"
                    tabIndex={0}
                    onClick={onCellClick}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onCellClick();
                      }
                    }}
                    className={cn(
                      "group/cell relative min-h-[4.9rem] border-r border-border p-1.5 last:border-r-0 transition-colors duration-150 hover:bg-muted/20",
                      empty && "schedule-cell-hatch",
                      today && !empty && "bg-primary/8",
                      today && empty && "ring-1 ring-inset ring-primary/25",
                    )}
                  >
                    <div className="relative flex flex-col gap-1.5">
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
                      {empty ? (
                        <div className="flex h-full min-h-[3.75rem] items-center justify-center rounded-md opacity-0 transition-opacity duration-150 group-hover/cell:opacity-100">
                          <span className="rounded-md bg-card/90 px-2 py-1 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border">
                            Add shift
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ),
        )}

        <div
          className="sticky bottom-0 grid border-t border-border bg-muted/40 shadow-[0_-4px_16px_rgba(0,0,0,0.35)] backdrop-blur-sm"
          style={{ gridTemplateColumns: `${TEAM_COLUMN_WIDTH} repeat(7, ${DAY_COLUMN_WIDTH})` }}
        >
          <div className="border-r border-border px-4 py-2 text-xs font-semibold text-muted-foreground">
            <p>Wages</p>
            <p>Hours</p>
          </div>
          {SCHEDULE_DAYS.map((day) => {
            const hours = dayTotal(shifts, day);
            return (
              <div
                key={day}
                className="border-r border-border px-3 py-2 text-right text-xs tabular-nums text-muted-foreground last:border-r-0"
              >
                <p className="font-semibold text-foreground">${(hours * 18).toFixed(2)}</p>
                <p>{hours.toFixed(2)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TeamRowLabel({ employee, shifts }: { employee: Employee; shifts: Shift[] }) {
  const hours = employeeTotal(shifts, employee);
  return (
    <div className="flex items-center gap-3">
      <EmployeeAvatar
        name={employee.name}
        avatarUrl={employee.avatarUrl}
        avatarColor={employee.avatarColor}
        initials={employee.initials}
        employeeId={employee.id}
        size="md"
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold text-foreground">{employee.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {hours.toFixed(2)} hrs / ${(hours * 18).toFixed(2)}
        </p>
      </div>
      <EyeIcon className="ml-auto size-4 text-muted-foreground/40" />
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

function openShiftHours(shifts: Shift[]) {
  return shifts
    .filter((shift) => !shift.employeeId)
    .reduce((sum, shift) => sum + calculateShiftHours(shift), 0);
}
