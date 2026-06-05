import { warningLabel } from "@/lib/timeclock-adapter";
import type { Employee, Position, Shift } from "@/lib/timeclock-types";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import { Checkbox } from "@timeclock/ui/components/checkbox";
import { Input } from "@timeclock/ui/components/input";
import { Label } from "@timeclock/ui/components/label";
import { Textarea } from "@timeclock/ui/components/textarea";
import { XIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
  DayPicker,
  ShiftField,
  ShiftFormSection,
  ShiftSelect,
  ShiftSummaryStrip,
} from "./shift-form-primitives";

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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in-0 duration-200"
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
        className="motion-product flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border animate-in fade-in-0 zoom-in-95 duration-200"
      >
        <header className="relative shrink-0 border-b border-border/50 px-5 pt-5 pb-4">
          <h2
            id="shift-dialog-title"
            className="pr-10 text-lg font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Set the day, time, employee, and position for this shift.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close"
            className="motion-product absolute top-4 right-4 text-muted-foreground"
          >
            <XIcon />
          </Button>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5 max-h-[min(70vh,640px)]">
          <ShiftSummaryStrip draft={draft} employees={employees} />
          <ShiftFormSection title="When">
            <ShiftField label="Day">
              <DayPicker
                days={days}
                value={draft.day}
                onChange={(day) => setDraft((current) => ({ ...current, day }))}
              />
            </ShiftField>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <ShiftField label="Start" htmlFor="shift-start">
                <Input
                  id="shift-start"
                  value={draft.start}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, start: event.target.value }))
                  }
                  className="motion-product h-9"
                />
              </ShiftField>
              <span className="pb-2 text-xs font-medium text-muted-foreground/80">to</span>
              <ShiftField label="End" htmlFor="shift-end">
                <Input
                  id="shift-end"
                  value={draft.end}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, end: event.target.value }))
                  }
                  className="motion-product h-9"
                />
              </ShiftField>
            </div>
          </ShiftFormSection>

          <ShiftFormSection title="Staffing">
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
                      warning: event.target.value === "open" ? "open-shift" : current.warning,
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
          </ShiftFormSection>

          <ShiftFormSection title="Breaks">
            <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
              <ShiftField label="Unpaid break minutes" htmlFor="shift-break">
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
                  className="motion-product h-9 tabular-nums"
                />
              </ShiftField>
              <div className="flex items-center gap-2.5 pb-0.5 sm:pb-1">
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
                <Label htmlFor={overnightId} className="cursor-pointer text-sm font-normal">
                  Overnight shift
                </Label>
              </div>
            </div>
          </ShiftFormSection>

          <ShiftFormSection title="Notes">
            <Textarea
              value={draft.notes ?? ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, notes: event.target.value }))
              }
              placeholder="Closing tasks, prep notes, training, handoff..."
              className="motion-product min-h-[88px] resize-y text-sm"
            />
          </ShiftFormSection>

          {warning ? (
            <div
              className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100"
              role="status"
            >
              <Badge tone="warning">{warning}</Badge>
              <span className="text-amber-800/90 dark:text-amber-200/90">
                This shift needs review before you save it.
              </span>
            </div>
          ) : null}
        </div>

        <footer className="sticky bottom-0 flex shrink-0 justify-end gap-2 rounded-b-2xl border-t border-border bg-card/95 px-5 py-4 backdrop-blur-sm">
          <Button type="button" variant="outline" onClick={onClose} className="motion-product">
            Cancel
          </Button>
          <Button type="submit" className="motion-product">
            {shift ? "Save changes" : "Create shift"}
          </Button>
        </footer>
      </form>
    </div>
  );
}
