import {
  calculateShiftHours,
  warningLabel,
} from "@/lib/timeclock-adapter";
import type { Employee, Position, Shift } from "@/lib/timeclock-types";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import { Input } from "@timeclock/ui/components/input";
import { Label } from "@timeclock/ui/components/label";
import { Textarea } from "@timeclock/ui/components/textarea";
import { XIcon } from "lucide-react";
import { useState } from "react";

const defaultPositions: Position[] = ["Manager", "Shift Lead", "Barista", "Cashier", "Cook", "Server"];
const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface ShiftDialogProps {
  open: boolean;
  shift?: Shift;
  employees: Employee[];
  positions?: Array<{ id: string; name: Position }>;
  onClose: () => void;
  onSave: (shift: Shift) => void;
}

export function ShiftDialog({ open, shift, employees, positions: positionOptions, onClose, onSave }: ShiftDialogProps) {
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

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm animate-in fade-in-0 duration-150">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft);
        }}
        className="w-full max-w-xl rounded-xl bg-background shadow-2xl ring-1 ring-foreground/10 animate-in fade-in-0 slide-in-from-bottom-4 duration-200"
      >
        <div className="flex items-start justify-between border-b p-4">
          <div>
            <h2 className="text-sm font-semibold">{shift ? "Edit shift" : "Create shift"}</h2>
            <p className="text-xs text-muted-foreground">
              {calculateShiftHours(draft).toFixed(1)} labor hours before backend persistence.
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
            <XIcon />
          </Button>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          <label className="grid gap-1">
            <Label>Employee</Label>
            <select
              value={draft.employeeId ?? "open"}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  employeeId:
                    event.target.value === "open" ? undefined : (event.target.value as Shift["employeeId"]),
                  warning: event.target.value === "open" ? "open-shift" : current.warning,
                }))
              }
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              <option value="open">Open shift</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <Label>Day</Label>
            <select
              value={draft.day}
              onChange={(event) => setDraft((current) => ({ ...current, day: event.target.value }))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <Label>Start</Label>
            <Input value={draft.start} onChange={(event) => setDraft((current) => ({ ...current, start: event.target.value }))} />
          </label>
          <label className="grid gap-1">
            <Label>End</Label>
            <Input value={draft.end} onChange={(event) => setDraft((current) => ({ ...current, end: event.target.value }))} />
          </label>
          <label className="grid gap-1">
            <Label>Position</Label>
            <select
              value={draft.position}
              onChange={(event) => {
                const selected = availablePositions.find((position) => position.name === event.target.value);
                setDraft((current) => ({
                  ...current,
                  position: event.target.value as Position,
                  positionId: selected?.id,
                }));
              }}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            >
              {availablePositions.map((position) => (
                <option key={position.id} value={position.name}>
                  {position.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <Label>Unpaid break minutes</Label>
            <Input
              type="number"
              min={0}
              step={15}
              value={draft.breakMinutes}
              onChange={(event) =>
                setDraft((current) => ({ ...current, breakMinutes: Number(event.target.value) }))
              }
            />
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea
              value={draft.notes ?? ""}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Close, prep, training, overnight handoff..."
            />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={Boolean(draft.overnight)}
              onChange={(event) => setDraft((current) => ({ ...current, overnight: event.target.checked }))}
            />
            <span className="text-xs">Overnight shift</span>
          </label>
          {warning ? (
            <div className="sm:col-span-2">
              <Badge tone="warning">{warning}</Badge>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t p-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{shift ? "Save changes" : "Create shift"}</Button>
        </div>
      </form>
    </div>
  );
}
