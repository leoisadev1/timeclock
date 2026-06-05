import { ShiftDialog } from "@/components/shift-dialog";
import {
  calculateShiftHours,
  getEmployees,
  getScheduleWeek,
  warningLabel,
} from "@/lib/timeclock-adapter";
import type { Employee, ScheduleWeek, Shift } from "@/lib/timeclock-types";
import { Badge } from "@timeclock/ui/components/badge";
import { parseDate, toDateString } from "@timeclock/ui/components/calendar";
import { TriangleAlertIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  getMondayWeekStart,
  ScheduleMobileView,
  ScheduleTeamGrid,
  ScheduleWeekNav,
  type ScheduleDay,
  weekDatesFromStart,
} from "@/components/schedule";

const surfaceClass = "overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border";

interface ScheduleBuilderProps {
  schedule: ScheduleWeek;
  employees?: Employee[];
  positions?: Array<{ id: string; name: Shift["position"] }>;
  onScheduleChange: (schedule: ScheduleWeek) => void;
  onWeekChange?: (weekStartDate: string) => void;
  onSaveShift?: (shift: Shift) => Promise<void>;
  onDuplicateShift?: (shift: Shift) => Promise<void>;
  onDeleteShift?: (shiftId: string) => Promise<void>;
  onPublishSchedule?: () => Promise<void>;
}

export function ScheduleBuilder({
  schedule,
  employees: providedEmployees,
  positions,
  onScheduleChange,
  onWeekChange,
  onSaveShift,
  onDuplicateShift,
  onDeleteShift,
  onPublishSchedule,
}: ScheduleBuilderProps) {
  const employees = (providedEmployees ?? getEmployees(schedule.locationId)).filter((e) => e.active);
  const [selectedDay, setSelectedDay] = useState<ScheduleDay>("Mon");
  const [editingShift, setEditingShift] = useState<Shift | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const weekDates = useMemo(
    () => weekDatesFromStart(schedule.weekStartDate),
    [schedule.weekStartDate],
  );

  const totalHours = schedule.shifts.reduce(
    (sum, shift) => sum + calculateShiftHours(shift),
    0,
  );
  const warnings = schedule.shifts.filter((s) => s.warning && s.warning !== "open-shift");
  const openShifts = schedule.shifts.filter((s) => !s.employeeId);
  const isCurrentWeek =
    schedule.weekStartDate === getMondayWeekStart(toDateString(new Date()));

  function navigateWeek(deltaWeeks: number) {
    const nextStart = addDaysLocal(schedule.weekStartDate, deltaWeeks * 7);
    if (onWeekChange) {
      onWeekChange(nextStart);
      return;
    }
    onScheduleChange(getScheduleWeek(schedule.locationId, nextStart));
  }

  function jumpToWeek(date: Date) {
    const weekStart = getMondayWeekStart(toDateString(date));
    if (onWeekChange) {
      onWeekChange(weekStart);
      return;
    }
    onScheduleChange(getScheduleWeek(schedule.locationId, weekStart));
  }

  function jumpToCurrentWeek() {
    const weekStart = getMondayWeekStart(toDateString(new Date()));
    if (onWeekChange) {
      onWeekChange(weekStart);
      return;
    }
    onScheduleChange(getScheduleWeek(schedule.locationId, weekStart));
  }

  async function saveShift(shift: Shift) {
    const normalized = { ...shift, locationId: schedule.locationId };
    if (onSaveShift) {
      await onSaveShift(normalized);
      setDialogOpen(false);
      setEditingShift(undefined);
      return;
    }
    const exists = schedule.shifts.some((s) => s.id === normalized.id);
    const shifts = exists
      ? schedule.shifts.map((s) => (s.id === normalized.id ? normalized : s))
      : [...schedule.shifts, normalized];
    onScheduleChange({ ...schedule, shifts, updatedAt: new Date().toISOString() });
    setDialogOpen(false);
    setEditingShift(undefined);
    toast.success(exists ? "Shift updated" : "Shift created");
  }

  async function duplicateShift(shift: Shift) {
    if (onDuplicateShift) {
      await onDuplicateShift(shift);
      return;
    }
    const copy: Shift = { ...shift, id: `${shift.id}-copy-${Date.now()}` };
    onScheduleChange({
      ...schedule,
      shifts: [...schedule.shifts, copy],
      updatedAt: new Date().toISOString(),
    });
    toast.success("Shift duplicated");
  }

  async function deleteShift(shiftId: string) {
    if (onDeleteShift) {
      await onDeleteShift(shiftId);
      return;
    }
    onScheduleChange({
      ...schedule,
      shifts: schedule.shifts.filter((s) => s.id !== shiftId),
      updatedAt: new Date().toISOString(),
    });
    toast.success("Shift deleted");
  }

  function openNew() {
    setEditingShift(undefined);
    setDialogOpen(true);
  }

  function openEdit(shift: Shift) {
    setEditingShift(shift);
    setDialogOpen(true);
  }

  const warningTitle = warnings
    .map((s) => `${s.day} ${s.start}: ${warningLabel(s.warning)}`)
    .join(" · ");

  return (
    <div className="grid gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3 lg:hidden">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
            <Badge tone={schedule.published ? "success" : "warning"}>
              {schedule.published ? "Published" : "Draft"}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {employees.length} employees · {totalHours.toFixed(1)} scheduled hours ·{" "}
            {openShifts.length} open shifts
          </p>
        </div>
      </header>

      {warnings.length > 0 ? (
        <section className="lg:hidden">
          <div className="rounded-xl bg-card shadow-sm ring-1 ring-border">
            <div className="border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <TriangleAlertIcon className="size-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-sm font-semibold">Warnings</h2>
              </div>
              <p className="text-xs text-muted-foreground">
                {warnings.length} shift {warnings.length === 1 ? "needs" : "need"} attention
              </p>
            </div>
            <div className="divide-y divide-border px-1 py-1">
              {warnings.map((shift) => (
                <div key={shift.id} className="px-3 py-2">
                  <Badge tone="warning">{warningLabel(shift.warning)}</Badge>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {shift.day} · {shift.start}–{shift.end} · {shift.position}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <div className={`hidden lg:block ${surfaceClass}`}>
        <ScheduleWeekNav
          weekStartDate={schedule.weekStartDate}
          isCurrentWeek={isCurrentWeek}
          warningCount={warnings.length}
          warningTitle={warningTitle}
          calendarOpen={calendarOpen}
          onCalendarOpenChange={setCalendarOpen}
          onPreviousWeek={() => navigateWeek(-1)}
          onNextWeek={() => navigateWeek(1)}
          onJumpToCurrentWeek={jumpToCurrentWeek}
          onPickWeek={jumpToWeek}
          onAddShift={openNew}
          onPublishSchedule={async () => {
            if (onPublishSchedule) {
              await onPublishSchedule();
              return;
            }
            onScheduleChange({
              ...schedule,
              published: !schedule.published,
              publishedAt: !schedule.published ? new Date().toISOString() : undefined,
              updatedAt: new Date().toISOString(),
            });
            toast.success(
              schedule.published
                ? "Schedule unpublished"
                : "Schedule published — employees can now see it",
            );
          }}
          published={schedule.published}
        />
        <ScheduleTeamGrid
          weekDates={weekDates}
          employees={employees}
          shifts={schedule.shifts}
          openShiftCount={openShifts.length}
          onCellClick={openNew}
          onEditShift={openEdit}
          onDuplicateShift={duplicateShift}
          onDeleteShift={deleteShift}
        />
      </div>

      <ScheduleMobileView
        weekDates={weekDates}
        weekStartDate={schedule.weekStartDate}
        isCurrentWeek={isCurrentWeek}
        selectedDay={selectedDay}
        shifts={schedule.shifts}
        employees={employees}
        onSelectedDayChange={setSelectedDay}
        onPreviousWeek={() => navigateWeek(-1)}
        onNextWeek={() => navigateWeek(1)}
        onJumpToCurrentWeek={jumpToCurrentWeek}
        onAddShift={openNew}
        onEditShift={openEdit}
        onDuplicateShift={duplicateShift}
        onDeleteShift={deleteShift}
      />

      <ShiftDialog
        open={dialogOpen}
        shift={editingShift}
        employees={employees}
        positions={positions}
        onClose={() => {
          setDialogOpen(false);
          setEditingShift(undefined);
        }}
        onSave={saveShift}
      />
    </div>
  );
}

function addDaysLocal(date: string, days: number): string {
  const parsed = parseDate(date);
  parsed.setDate(parsed.getDate() + days);
  return toDateString(parsed);
}
