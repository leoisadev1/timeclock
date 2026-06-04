import { ShiftDialog } from "@/components/shift-dialog";
import {
  calculateShiftHours,
  getEmployees,
  warningLabel,
} from "@/lib/timeclock-adapter";
import type { Employee, Position, ScheduleWeek, Shift } from "@/lib/timeclock-types";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import {
  CopyIcon,
  PencilIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Position → color palette (bg, text, border) — works light + dark
const POSITION_COLORS: Record<Position, { block: string; dot: string }> = {
  Manager: {
    block: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25",
    dot: "bg-emerald-500",
  },
  "Shift Lead": {
    block: "bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/25",
    dot: "bg-blue-500",
  },
  Barista: {
    block: "bg-violet-500/15 text-violet-800 dark:text-violet-300 border border-violet-500/25",
    dot: "bg-violet-500",
  },
  Cashier: {
    block: "bg-rose-500/15 text-rose-800 dark:text-rose-300 border border-rose-500/25",
    dot: "bg-rose-500",
  },
  Cook: {
    block: "bg-teal-500/15 text-teal-800 dark:text-teal-300 border border-teal-500/25",
    dot: "bg-teal-500",
  },
  Server: {
    block: "bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25",
    dot: "bg-amber-500",
  },
};

interface ScheduleBuilderProps {
  schedule: ScheduleWeek;
  employees?: Employee[];
  positions?: Array<{ id: string; name: Position }>;
  onScheduleChange: (schedule: ScheduleWeek) => void;
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
  onSaveShift,
  onDuplicateShift,
  onDeleteShift,
  onPublishSchedule,
}: ScheduleBuilderProps) {
  const employees = (providedEmployees ?? getEmployees(schedule.locationId)).filter((e) => e.active);
  const [selectedDay, setSelectedDay] = useState("Mon");
  const [editingShift, setEditingShift] = useState<Shift | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);

  const totalHours = schedule.shifts.reduce((sum, s) => sum + calculateShiftHours(s), 0);
  const warnings = schedule.shifts.filter((s) => s.warning && s.warning !== "open-shift");
  const coverage = useMemo(() => buildCoverage(schedule.shifts), [schedule.shifts]);
  const openShifts = schedule.shifts.filter((s) => !s.employeeId);

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

  return (
    <div className="grid gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">Schedule</h1>
            <Badge tone={schedule.published ? "success" : "warning"}>
              {schedule.published ? "Published" : "Draft"}
            </Badge>
            <span className="text-xs text-muted-foreground">Week of {schedule.weekStartDate}</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {employees.length} employees · {totalHours.toFixed(1)} scheduled hours · {openShifts.length} open shifts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openNew}>
            <PlusIcon /> Add shift
          </Button>
          <Button
            variant={schedule.published ? "outline" : "default"}
            onClick={async () => {
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
              toast.success(schedule.published ? "Schedule unpublished" : "Schedule published — employees can now see it");
            }}
          >
            <SendIcon />
            {schedule.published ? "Unpublish" : "Publish schedule"}
          </Button>
        </div>
      </div>

      {/* Warnings banner */}
      {warnings.length > 0 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
          <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
          <span>
            {warnings.length} shift {warnings.length === 1 ? "warning" : "warnings"}:{" "}
            {warnings.map((s) => `${s.day} ${s.start} (${warningLabel(s.warning)})`).join(", ")}
          </span>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_240px]">
        {/* ── Desktop grid ──────────────────────────────────────────────── */}
        <div className="hidden overflow-x-auto rounded-xl ring-1 ring-foreground/10 lg:block">
          {/* Day headers */}
          <div
            className="grid bg-muted/50"
            style={{ gridTemplateColumns: "160px repeat(7, minmax(110px, 1fr))" }}
          >
            <div className="border-b border-r px-3 py-2.5 text-xs font-semibold text-muted-foreground">
              Team
            </div>
            {DAYS.map((day) => (
              <div
                key={day}
                className="border-b border-r px-3 py-2.5 last:border-r-0"
              >
                <div className="text-xs font-semibold">{day}</div>
                <div className="text-[10px] text-muted-foreground">
                  {dayTotal(schedule.shifts, day).toFixed(1)}h scheduled
                </div>
              </div>
            ))}
          </div>

          {/* Employee rows */}
          {[...employees, undefined].map((employee) => (
            <div
              key={employee?.id ?? "open-shifts"}
              className="grid border-b last:border-b-0"
              style={{ gridTemplateColumns: "160px repeat(7, minmax(110px, 1fr))" }}
            >
              {/* Employee name column */}
              <div className="border-r px-3 py-3">
                {employee ? (
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white ${employee.avatarColor}`}
                    >
                      {employee.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold">{employee.name}</p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {employee.position} · {employeeTotal(schedule.shifts, employee).toFixed(1)}h
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Open Shifts</p>
                    <p className="text-[10px] text-muted-foreground">{openShifts.length} unassigned</p>
                  </div>
                )}
              </div>

              {/* Day cells */}
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="relative min-h-24 border-r p-1.5 last:border-r-0"
                  onClick={() => {
                    setEditingShift(undefined);
                    setDialogOpen(true);
                  }}
                >
                  <div className="grid gap-1">
                    {cellShifts(schedule.shifts, day, employee).map((shift) => (
                      <ShiftBlock
                        key={shift.id}
                        shift={shift}
                        employee={employee}
                        onEdit={() => { setEditingShift(shift); setDialogOpen(true); }}
                        onDuplicate={() => duplicateShift(shift)}
                        onDelete={() => deleteShift(shift.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ── Mobile day picker + list ──────────────────────────────────── */}
        <div className="grid gap-3 lg:hidden">
          <div className="flex gap-1 overflow-x-auto">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`flex shrink-0 flex-col items-center rounded-lg px-3 py-2 text-center transition-[background-color,color] duration-150 ${
                  selectedDay === day
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
              >
                <span className="text-xs font-semibold">{day}</span>
                <span className="text-[10px] opacity-70">{dayTotal(schedule.shifts, day).toFixed(1)}h</span>
              </button>
            ))}
          </div>
          <div className="grid gap-2 rounded-xl ring-1 ring-foreground/10 p-3">
            {schedule.shifts
              .filter((s) => s.day === selectedDay)
              .map((shift) => {
                const emp = shift.employeeId
                  ? employees.find((e) => e.id === shift.employeeId)
                  : undefined;
                return (
                  <ShiftBlock
                    key={shift.id}
                    shift={shift}
                    employee={emp}
                    onEdit={() => { setEditingShift(shift); setDialogOpen(true); }}
                    onDuplicate={() => duplicateShift(shift)}
                    onDelete={() => deleteShift(shift.id)}
                  />
                );
              })}
            {schedule.shifts.filter((s) => s.day === selectedDay).length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">No shifts on {selectedDay}</p>
            )}
          </div>
        </div>

        {/* ── Sidebar: coverage + warnings ─────────────────────────────── */}
        <aside className="grid gap-4 content-start">
          {/* Coverage by position */}
          <div className="rounded-xl ring-1 ring-foreground/10">
            <div className="border-b px-4 py-3">
              <h2 className="text-sm font-semibold">Coverage</h2>
              <p className="text-xs text-muted-foreground">{totalHours.toFixed(1)}h total scheduled</p>
            </div>
            <div className="divide-y px-1 py-1">
              {coverage.map((item) => {
                const colors = POSITION_COLORS[item.position as Position];
                return (
                  <div key={item.key} className="flex items-center justify-between px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className={`size-2 rounded-full ${colors?.dot ?? "bg-muted-foreground"}`} />
                      <span className="text-xs">{item.position}</span>
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {item.hours.toFixed(1)}h
                    </span>
                  </div>
                );
              })}
              {coverage.length === 0 && (
                <p className="px-3 py-3 text-xs text-muted-foreground">No shifts yet.</p>
              )}
            </div>
          </div>

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="rounded-xl ring-1 ring-foreground/10">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Warnings</h2>
              </div>
              <div className="divide-y px-1 py-1">
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
          )}
        </aside>
      </div>

      <ShiftDialog
        open={dialogOpen}
        shift={editingShift}
        employees={employees}
        positions={positions}
        onClose={() => { setDialogOpen(false); setEditingShift(undefined); }}
        onSave={saveShift}
      />
    </div>
  );
}

// ── Shift block component ─────────────────────────────────────────────────────

function ShiftBlock({
  shift,
  employee: _employee,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  shift: Shift;
  employee?: Employee;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const colors = POSITION_COLORS[shift.position] ?? {
    block: "bg-muted text-muted-foreground border border-border",
    dot: "bg-muted-foreground",
  };
  const isOpen = !shift.employeeId;
  const warning = warningLabel(shift.warning);
  const hours = calculateShiftHours(shift);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`group relative rounded-lg px-2.5 py-2 text-xs transition-opacity duration-150 ${
        isOpen
          ? "border border-dashed border-muted-foreground/30 text-muted-foreground"
          : colors.block
      }`}
    >
      {/* Time + hours */}
      <div className="font-semibold leading-tight">
        {shift.start} – {shift.end}
      </div>
      <div className="mt-0.5 flex items-center gap-1 text-[10px] opacity-80">
        <span>{shift.position}</span>
        {shift.overnight && <span className="opacity-60">· overnight</span>}
        {warning && <span className="opacity-60">· ⚠</span>}
      </div>
      <div className="mt-1 text-[10px] font-medium opacity-70">{hours.toFixed(1)}h</div>

      {/* Action buttons — show on hover */}
      <div className="absolute right-1 top-1 hidden items-center gap-0.5 group-hover:flex">
        <button
          type="button"
          onClick={onEdit}
          className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
          aria-label="Edit"
        >
          <PencilIcon className="size-2.5" />
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
          aria-label="Duplicate"
        >
          <CopyIcon className="size-2.5" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
          aria-label="Delete"
        >
          <Trash2Icon className="size-2.5" />
        </button>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function buildCoverage(shifts: Shift[]) {
  const map = new Map<string, number>();
  for (const s of shifts) {
    map.set(s.position, (map.get(s.position) ?? 0) + calculateShiftHours(s));
  }
  return [...map.entries()].map(([position, hours]) => ({
    key: position,
    position,
    hours,
  }));
}
