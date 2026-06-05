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

const TEAM_COLUMN_WIDTH = "minmax(11rem, 13rem)";

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

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[960px]">
        <div
          className="grid border-b border-border bg-muted/20"
          style={{ gridTemplateColumns: `${TEAM_COLUMN_WIDTH} repeat(7, minmax(0, 1fr))` }}
        >
          <div className="border-r border-border px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Team
          </div>
          {weekDates.map(({ day, iso }) => {
            const today = isTodayIso(iso);
            return (
              <div
                key={day}
                className={`border-r border-border px-2 py-3 text-center last:border-r-0 ${
                  today ? "bg-primary/5" : ""
                }`}
              >
                <p
                  className={`text-xs font-semibold tracking-wide ${
                    today ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {formatDayColumnHeader(iso, day)}
                </p>
                <p className="mt-0.5 text-[11px] tabular-nums text-muted-foreground">
                  {dayTotal(shifts, day).toFixed(1)}h
                </p>
              </div>
            );
          })}
        </div>

        {rows.map((employee, rowIndex) => (
          <div
            key={employee?.id ?? "open-shifts"}
            className={`grid border-b border-border last:border-b-0 ${
              rowIndex % 2 === 1 ? "bg-muted/5" : ""
            }`}
            style={{ gridTemplateColumns: `${TEAM_COLUMN_WIDTH} repeat(7, minmax(0, 1fr))` }}
          >
            <div className="border-r border-border px-4 py-4">
              {employee ? (
                <TeamRowLabel employee={employee} shifts={shifts} />
              ) : (
                <div>
                  <p className="text-sm font-semibold text-foreground">Open shifts</p>
                  <p className="text-xs text-muted-foreground">{openShiftCount} unassigned</p>
                </div>
              )}
            </div>

            {SCHEDULE_DAYS.map((day) => {
              const iso = weekDates.find((entry) => entry.day === day)?.iso ?? "";
              const today = isTodayIso(iso);
              const cellShiftsList = cellShifts(shifts, day, employee);

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
                  className={`group/cell relative min-h-[8.5rem] border-r border-border p-2 last:border-r-0 transition-colors duration-150 hover:bg-muted/15 ${
                    today ? "bg-primary/[0.03]" : ""
                  }`}
                >
                  <div className="flex flex-col gap-2">
                    {cellShiftsList.map((shift) => (
                      <ScheduleShiftCard
                        key={shift.id}
                        shift={shift}
                        employee={employee}
                        onEdit={() => onEditShift(shift)}
                        onDuplicate={() => onDuplicateShift(shift)}
                        onDelete={() => onDeleteShift(shift.id)}
                      />
                    ))}
                    {cellShiftsList.length === 0 ? (
                      <div className="flex h-full min-h-[5rem] items-center justify-center rounded-lg border border-dashed border-transparent opacity-0 transition-opacity duration-150 group-hover/cell:border-border/60 group-hover/cell:opacity-100">
                        <span className="text-[11px] text-muted-foreground">Add shift</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function TeamRowLabel({ employee, shifts }: { employee: Employee; shifts: Shift[] }) {
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
        <p className="truncate text-sm font-semibold text-foreground">{employee.name}</p>
        <p className="truncate text-xs text-muted-foreground">{employee.position}</p>
        <p className="mt-0.5 text-xs font-medium tabular-nums text-primary">
          {employeeTotal(shifts, employee).toFixed(1)}h
        </p>
      </div>
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
