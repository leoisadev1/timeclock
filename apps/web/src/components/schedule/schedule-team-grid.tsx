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
    <div className="overflow-x-auto">
      <div className="min-w-[1220px]">
        <div
          className="grid border-b border-[#dedbd1] bg-white"
          style={{ gridTemplateColumns: `${TEAM_COLUMN_WIDTH} repeat(7, ${DAY_COLUMN_WIDTH})` }}
        >
          <div className="border-r border-[#dedbd1] px-4 py-2">
            <label className="grid gap-1">
              <span className="text-xs font-semibold text-[#6f6a5f]">View by</span>
              <select className="h-9 rounded-md border border-[#c9c3b5] bg-white px-3 text-sm font-medium text-[#2d1b4f] outline-none">
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
                className={`border-r border-[#dedbd1] px-2 py-4 text-center last:border-r-0 ${
                  today ? "bg-[#f8f4ff]" : ""
                }`}
              >
                <p
                  className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${
                    today
                      ? "border border-primary text-primary"
                      : "text-[#2d1b4f]"
                  }`}
                >
                  {formatDayColumnHeader(iso, day)}
                </p>
                <p className="mt-1 text-[11px] tabular-nums text-[#767167]">
                  {dayTotal(shifts, day).toFixed(1)}h
                </p>
              </div>
            );
          })}
        </div>

        <div
          className="grid border-b border-[#dedbd1] bg-white"
          style={{ gridTemplateColumns: `${TEAM_COLUMN_WIDTH} repeat(7, ${DAY_COLUMN_WIDTH})` }}
        >
          <div className="flex items-center gap-3 border-r border-[#dedbd1] px-4 py-3 text-sm font-semibold text-[#2d1b4f]">
            <CalendarDaysIcon className="size-4 text-[#6f6a5f]" />
            Events (0)
          </div>
          {weekDates.map(({ day }) => (
            <div key={day} className="min-h-12 border-r border-[#dedbd1] last:border-r-0" />
          ))}
        </div>

        <div
          className="grid border-b border-[#dedbd1] bg-white"
          style={{ gridTemplateColumns: `${TEAM_COLUMN_WIDTH} repeat(7, ${DAY_COLUMN_WIDTH})` }}
        >
          <div className="flex items-center gap-3 border-r border-[#dedbd1] px-4 py-3">
            <CircleIcon className="size-4 fill-[#6f6a5f] text-[#6f6a5f]" />
            <div>
              <p className="text-sm font-semibold text-[#2d1b4f]">Open shifts ({openShiftCount})</p>
              <p className="text-xs tabular-nums text-[#767167]">
                {openShiftHours(shifts).toFixed(2)} hours need coverage
              </p>
            </div>
          </div>
          {SCHEDULE_DAYS.map((day) => {
            const cellShiftsList = cellShifts(shifts, day, undefined);
            return (
              <div
                key={day}
                role="button"
                tabIndex={0}
                onClick={onCellClick}
                className="min-h-[4.5rem] border-r border-[#dedbd1] p-1.5 last:border-r-0 hover:bg-[#faf9f5]"
              >
                <div className="grid gap-1.5">
                  {cellShiftsList.map((shift) => (
                    <ScheduleShiftCard
                      key={shift.id}
                      shift={shift}
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

        <div className="border-b border-[#dedbd1] bg-[#f2f1ed] px-4 py-2 text-sm font-bold text-[#6f6a5f]">
          Team members ({teamRows})
        </div>

        {rows.map((employee, rowIndex) => (
          !employee ? null : (
          <div
            key={employee.id}
            className={`grid border-b border-[#dedbd1] last:border-b-0 ${
              rowIndex % 2 === 1 ? "bg-[#fbfaf7]" : "bg-white"
            }`}
            style={{ gridTemplateColumns: `${TEAM_COLUMN_WIDTH} repeat(7, ${DAY_COLUMN_WIDTH})` }}
          >
            <div className="border-r border-[#dedbd1] px-4 py-3">
              <TeamRowLabel employee={employee} shifts={shifts} />
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
                  className={`group/cell relative min-h-[4.9rem] border-r border-[#dedbd1] p-1.5 last:border-r-0 transition-colors duration-150 hover:bg-[#faf9f5] ${
                    today ? "bg-[#f8f4ff]" : ""
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
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
                      <div className="flex h-full min-h-[3.75rem] items-center justify-center rounded-md border border-dashed border-transparent opacity-0 transition-opacity duration-150 group-hover/cell:border-[#c9c3b5] group-hover/cell:opacity-100">
                        <span className="text-[11px] text-muted-foreground">Add shift</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
          )
        ))}

        <div
          className="sticky bottom-0 grid border-t border-[#dedbd1] bg-[#f6f5f1] shadow-[0_-4px_12px_rgba(45,27,79,0.06)]"
          style={{ gridTemplateColumns: `${TEAM_COLUMN_WIDTH} repeat(7, ${DAY_COLUMN_WIDTH})` }}
        >
          <div className="border-r border-[#dedbd1] px-4 py-2 text-xs font-semibold text-[#6f6a5f]">
            <p>Wages</p>
            <p>Hours</p>
          </div>
          {SCHEDULE_DAYS.map((day) => {
            const hours = dayTotal(shifts, day);
            return (
              <div key={day} className="border-r border-[#dedbd1] px-3 py-2 text-right text-xs tabular-nums text-[#6f6a5f] last:border-r-0">
                <p className="font-semibold">${(hours * 18).toFixed(2)}</p>
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
        <p className="truncate text-sm font-bold text-[#2d1b4f]">{employee.name}</p>
        <p className="truncate text-xs text-[#767167]">
          {hours.toFixed(2)} hrs / ${(hours * 18).toFixed(2)}
        </p>
      </div>
      <EyeIcon className="ml-auto size-4 text-[#d7d3c7]" />
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
