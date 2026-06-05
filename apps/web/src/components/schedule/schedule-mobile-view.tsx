import {
  formatDayColumnHeader,
  formatWeekOfLabel,
  type ScheduleDay,
} from "@/components/schedule/date-utils";
import { ScheduleShiftCard } from "@/components/schedule/schedule-shift-card";
import type { Employee, Shift } from "@/lib/timeclock-types";
import { Button } from "@timeclock/ui/components/button";
import { cn } from "@timeclock/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon, TriangleAlertIcon } from "lucide-react";

type WeekDate = { day: ScheduleDay; iso: string };

type ScheduleMobileViewProps = {
  weekDates: WeekDate[];
  weekStartDate: string;
  isCurrentWeek: boolean;
  selectedDay: ScheduleDay;
  shifts: Shift[];
  employees: Employee[];
  warningCount?: number;
  onSelectedDayChange: (day: ScheduleDay) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onJumpToCurrentWeek: () => void;
  onAddShift: () => void;
  onEditShift: (shift: Shift) => void;
  onDuplicateShift: (shift: Shift) => void;
  onDeleteShift: (shiftId: string) => void;
};

export function ScheduleMobileView({
  weekDates,
  weekStartDate,
  isCurrentWeek,
  selectedDay,
  shifts,
  employees,
  warningCount = 0,
  onSelectedDayChange,
  onPreviousWeek,
  onNextWeek,
  onJumpToCurrentWeek,
  onAddShift,
  onEditShift,
  onDuplicateShift,
  onDeleteShift,
}: ScheduleMobileViewProps) {
  const dayShifts = shifts.filter((shift) => shift.day === selectedDay);
  const selectedIso = weekDates.find((entry) => entry.day === selectedDay)?.iso ?? weekStartDate;

  return (
    <div className="grid gap-3 lg:hidden">
      <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border">
        <div className="flex items-center gap-2 border-b border-border px-3 py-3">
          <Button type="button" variant="outline" size="icon-sm" onClick={onPreviousWeek}>
            <ChevronLeftIcon />
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-semibold">{formatWeekOfLabel(weekStartDate)}</p>
            {!isCurrentWeek ? (
              <button
                type="button"
                onClick={onJumpToCurrentWeek}
                className="text-xs font-medium text-primary"
              >
                Jump to this week
              </button>
            ) : (
              <p className="text-[11px] text-muted-foreground">Current week</p>
            )}
          </div>
          <Button type="button" variant="outline" size="icon-sm" onClick={onNextWeek}>
            <ChevronRightIcon />
          </Button>
        </div>

        {warningCount > 0 ? (
          <div className="flex items-center gap-1.5 border-b border-border px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-300">
            <TriangleAlertIcon className="size-3.5" />
            {warningCount} {warningCount === 1 ? "issue needs" : "issues need"} attention
          </div>
        ) : null}

        <div className="flex gap-1 overflow-x-auto p-2">
          {weekDates.map(({ day, iso }) => {
            const active = day === selectedDay;
            const count = shifts.filter((shift) => shift.day === day).length;
            return (
              <button
                key={day}
                type="button"
                onClick={() => onSelectedDayChange(day)}
                className={cn(
                  "shrink-0 rounded-lg px-3 py-2 text-left transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/40 text-muted-foreground",
                )}
              >
                <p className="text-xs font-semibold">{formatDayColumnHeader(iso, day)}</p>
                <p className={cn("mt-0.5 text-[10px] tabular-nums", active && "opacity-90")}>
                  {count} shifts
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl bg-card p-3 shadow-sm ring-1 ring-border">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{formatDayColumnHeader(selectedIso, selectedDay)}</p>
          <Button type="button" size="sm" variant="outline" className="rounded-lg" onClick={onAddShift}>
            Add shift
          </Button>
        </div>

        <div className="grid gap-2">
          {dayShifts.map((shift) => {
            const employee = employees.find((entry) => entry.id === shift.employeeId);
            return (
              <ScheduleShiftCard
                key={shift.id}
                shift={shift}
                employee={employee}
                showAssignee
                onEdit={() => onEditShift(shift)}
                onDuplicate={() => onDuplicateShift(shift)}
                onDelete={() => onDeleteShift(shift.id)}
              />
            );
          })}
          {dayShifts.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No shifts on {selectedDay}. Tap Add shift to schedule someone.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
