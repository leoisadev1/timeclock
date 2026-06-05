import {
  DayPicker,
  ShiftField,
  ShiftFormPanel,
  ShiftFormSection,
  ShiftSelect,
  ShiftSummaryStrip,
  shiftControlClass,
} from "@/components/shift-form-primitives";
import { warningLabel } from "@/lib/timeclock-adapter";
import type { Employee, Position, Shift } from "@/lib/timeclock-types";
import { Button } from "@timeclock/ui/components/button";
import { Checkbox } from "@timeclock/ui/components/checkbox";
import { Input } from "@timeclock/ui/components/input";
import { Label } from "@timeclock/ui/components/label";
import { Textarea } from "@timeclock/ui/components/textarea";
import { cn } from "@timeclock/ui/lib/utils";
import { TriangleAlertIcon, XIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";

const defaultPositions: Position[] = [
  "Manager",
  "Shift Lead",
  "Barista",
  "Cashier",
  "Cook",
  "Server",
];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface ShiftDialogProps {
  open: boolean;
  shift?: Shift;
  employees: Employee[];
  positions?: Array<{ id: string; name: Position }>;
  onClose: () => void;
  onSave: (shift: Shift) => void;
}

export function ShiftDialog({
  open,
  shift,
  employees,
  positions: positionOptions,
  onClose,
  onSave,
}: ShiftDialogProps) {
  if (!open) {
    return null;
  }
  return (
    <ShiftDialogForm
      key={shift?.id ?? "new"}
      shift={shift}
      employees={employees}
      positions={positionOptions}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function ShiftDialogForm({
  shift,
  employees,
  positions,
  onClose,
  onSave,
}: Omit<ShiftDialogProps, "open">) {
  const availablePositions = positions?.length
    ? positions
    : defaultPositions.map((position) => ({ id: position, name: position }));
  const [draft, setDraft] = useState<Shift>(
    shift ?? {
      id: `shift-${Date.now()}`,
      locationId: "loc-downtown",
      day: "Mon",
      start: "9:00 AM",
      end: "5:00 PM",
      position: availablePositions[0]?.name ?? "Barista",
      positionId: availablePositions[0]?.id,
      breakMinutes: 30,
      notes: "",
    },
  );
  const warning = warningLabel(draft.warning);
  const overnightId = useId();
  const title = shift ? "Edit shift" : "Create shift";
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4 motion-product animate-in fade-in-0 duration-200"
      onClick={onClose}
      role="presentation"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shift-dialog-title"
        className={cn(
          "flex max-h-[min(92dvh,720px)] w-full max-w-lg flex-col overflow-hidden",
          "rounded-t-2xl border border-border bg-card shadow-2xl sm:rounded-2xl",
          "animate-view-enter",
        )}
      >
        <header className="relative shrink-0 border-b border-border/80 px-5 pt-5 pb-4">
          <h2
            id="shift-dialog-title"
            className="pr-10 text-lg font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Set the day, time, employee, and position for this shift.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close"
            className="motion-product absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          >
            <XIcon />
          </Button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
          <ShiftSummaryStrip draft={draft} employees={employees} />

          <ShiftFormSection title="When">
            <ShiftFormPanel className="space-y-4">
              <DayPicker
                days={days}
                value={draft.day}
                onChange={(day) => setDraft((current) => ({ ...current, day }))}
              />
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                <ShiftField label="Start" htmlFor="shift-start">
                  <Input
                    id="shift-start"
                    autoFocus
                    value={draft.start}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, start: event.target.value }))
                    }
                    className={cn(shiftControlClass, "tabular-nums")}
                  />
                </ShiftField>
                <span className="pb-2.5 text-xs font-medium text-muted-foreground">to</span>
                <ShiftField label="End" htmlFor="shift-end">
                  <Input
                    id="shift-end"
                    value={draft.end}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, end: event.target.value }))
                    }
                    className={cn(shiftControlClass, "tabular-nums")}
                  />
                </ShiftField>
              </div>
            </ShiftFormPanel>
          </ShiftFormSection>

          <ShiftFormSection title="Staffing">
            <ShiftFormPanel>
              <div className="grid gap-3 sm:grid-cols-2">
                <ShiftField label="Employee" htmlFor="shift-employee">
                  <ShiftSelect
                    id="shift-employee"
                    value={draft.employeeId ?? "open"}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        employeeId:
                          event.target.value === "open"
                            ? undefined
                            : (event.target.value as Shift["employeeId"]),
                        warning:
                          event.target.value === "open" ? "open-shift" : current.warning,
                      }))
                    }
                  >
                    <option value="open">Open shift</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name}
                      </option>
                    ))}
                  </ShiftSelect>
                </ShiftField>
                <ShiftField label="Position" htmlFor="shift-position">
                  <ShiftSelect
                    id="shift-position"
                    value={draft.position}
                    onChange={(event) => {
                      const selected = availablePositions.find(
                        (position) => position.name === event.target.value,
                      );
                      setDraft((current) => ({
                        ...current,
                        position: event.target.value as Position,
                        positionId: selected?.id,
                      }));
                    }}
                  >
                    {availablePositions.map((position) => (
                      <option key={position.id} value={position.name}>
                        {position.name}
                      </option>
                    ))}
                  </ShiftSelect>
                </ShiftField>
              </div>
            </ShiftFormPanel>
          </ShiftFormSection>

          <ShiftFormSection title="Breaks & notes">
            <ShiftFormPanel className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <ShiftField label="Unpaid break (minutes)" htmlFor="shift-break">
                  <Input
                    id="shift-break"
                    type="number"
                    min={0}
                    step={15}
                    value={draft.breakMinutes}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        breakMinutes: Number(event.target.value),
                      }))
                    }
                    className={cn(shiftControlClass, "tabular-nums")}
                  />
                </ShiftField>
                <div className="flex h-10 items-center gap-2.5 sm:pb-0">
                  <Checkbox
                    id={overnightId}
                    checked={Boolean(draft.overnight)}
                    onCheckedChange={(checked) =>
                      setDraft((current) => ({
                        ...current,
                        overnight: checked === true,
                      }))
                    }
                    className="motion-product"
                  />
                  <Label
                    htmlFor={overnightId}
                    className="cursor-pointer text-sm font-normal text-foreground"
                  >
                    Overnight shift
                  </Label>
                </div>
              </div>
              <ShiftField label="Notes" htmlFor="shift-notes">
                <Textarea
                  id="shift-notes"
                  value={draft.notes ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="Closing tasks, prep notes, training, handoff..."
                  className={cn(
                    shiftControlClass,
                    "min-h-[88px] resize-y bg-muted/20 py-2.5 leading-relaxed",
                  )}
                />
              </ShiftField>
            </ShiftFormPanel>
          </ShiftFormSection>

          {warning ? (
            <div
              className="motion-product flex items-start gap-2.5 rounded-xl border border-amber-500/35 bg-amber-500/8 px-3.5 py-3 text-sm"
              role="status"
            >
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="min-w-0 space-y-0.5">
                <p className="font-medium text-amber-950 dark:text-amber-100">{warning}</p>
                <p className="text-xs text-amber-900/80 dark:text-amber-200/80">
                  Review this shift before saving — it may conflict with hours or coverage rules.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-border/80 bg-card px-5 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="motion-product text-muted-foreground"
          >
            Cancel
          </Button>
          <Button type="submit" className="motion-product min-w-[7.5rem]">
            {shift ? "Save changes" : "Create shift"}
          </Button>
        </footer>
      </form>
    </div>
  );
}
