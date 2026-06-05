import { EmployeeAvatar } from "@/components/employee-avatar";
import { ShiftField, ShiftFormSection, ShiftSelect } from "@/components/shift-form-primitives";
import { DEMO_POSITIONS, positionColorClasses } from "@/lib/location-positions";
import type { AppRole, Employee, LocationPosition } from "@/lib/timeclock-types";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import { Input } from "@timeclock/ui/components/input";
import { cn } from "@timeclock/ui/lib/utils";
import { ExternalLinkIcon, RefreshCwIcon, XIcon } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";

export type EmployeeFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  pin: string;
  role: AppRole;
  positionId: string;
};

type EmployeeFormDialogProps = {
  open: boolean;
  mode: "create" | "edit";
  employee?: Employee;
  positions?: LocationPosition[];
  onClose: () => void;
  onSave: (values: EmployeeFormValues) => Promise<void> | void;
  onOpenSettings?: () => void;
  saving?: boolean;
};

function splitName(employee?: Employee): { firstName: string; lastName: string } {
  if (employee?.firstName || employee?.lastName) {
    return {
      firstName: employee.firstName ?? "",
      lastName: employee.lastName ?? "",
    };
  }
  const parts = (employee?.name ?? "").trim().split(/\s+/);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function randomPin() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export function EmployeeFormDialog({
  open,
  mode,
  employee,
  positions = DEMO_POSITIONS,
  onClose,
  onSave,
  onOpenSettings,
  saving = false,
}: EmployeeFormDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <EmployeeFormDialogBody
      key={employee?.id ?? "new"}
      mode={mode}
      employee={employee}
      positions={positions}
      onClose={onClose}
      onSave={onSave}
      onOpenSettings={onOpenSettings}
      saving={saving}
    />
  );
}

function EmployeeFormDialogBody({
  mode,
  employee,
  positions = DEMO_POSITIONS,
  onClose,
  onSave,
  onOpenSettings,
  saving,
}: Omit<EmployeeFormDialogProps, "open"> & { positions: LocationPosition[] }) {
  const activePositions = useMemo(
    () => positions.filter((position) => position.active),
    [positions],
  );
  const initialNames = splitName(employee);
  const [firstName, setFirstName] = useState(initialNames.firstName);
  const [lastName, setLastName] = useState(initialNames.lastName);
  const [email, setEmail] = useState(employee?.email ?? "");
  const [pin, setPin] = useState(employee?.pin ?? randomPin());
  const [role, setRole] = useState<AppRole>(employee?.role ?? "employee");
  const [positionId, setPositionId] = useState(
    employee?.positionId ?? activePositions[0]?.id ?? "",
  );
  const firstNameId = useId();
  const lastNameId = useId();
  const emailId = useId();
  const pinId = useId();
  const roleId = useId();
  const positionIdField = useId();

  const displayName = `${firstName} ${lastName}`.trim() || "New employee";
  const selectedPosition = activePositions.find((position) => position.id === positionId);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !positionId) {
      return;
    }
    await onSave({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      pin: pin.trim(),
      role,
      positionId,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/75 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl ring-1 ring-border animate-in fade-in-0 slide-in-from-bottom-4 duration-200 sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <EmployeeAvatar
              name={displayName}
              initials={`${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase() || "?"}
              avatarColor={employee?.avatarColor ?? "bg-primary"}
              avatarUrl={employee?.avatarUrl}
              employeeId={employee?.id}
              size="lg"
            />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {mode === "create" ? "New employee" : "Edit employee"}
              </p>
              <h2 className="truncate text-lg font-semibold tracking-tight">{displayName}</h2>
              {employee ? (
                <Badge tone={employee.active ? "success" : "neutral"} className="mt-1">
                  {employee.active ? "Active" : "Inactive"}
                </Badge>
              ) : null}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close"
          >
            <XIcon />
          </Button>
        </header>

        <div className="overflow-y-auto px-5 py-4">
          <div className="grid gap-6">
            <ShiftFormSection title="Profile">
              <div className="grid gap-3 sm:grid-cols-2">
                <ShiftField label="First name" htmlFor={firstNameId}>
                  <Input
                    id={firstNameId}
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Maya"
                    required
                    autoFocus
                  />
                </ShiftField>
                <ShiftField label="Last name" htmlFor={lastNameId}>
                  <Input
                    id={lastNameId}
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Chen"
                    required
                  />
                </ShiftField>
                <ShiftField label="Email" htmlFor={emailId} className="sm:col-span-2">
                  <Input
                    id={emailId}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="maya@example.com"
                  />
                </ShiftField>
              </div>
            </ShiftFormSection>

            <ShiftFormSection title="Access & job">
              <div className="grid gap-3 sm:grid-cols-2">
                <ShiftField label="Role" htmlFor={roleId}>
                  <ShiftSelect
                    id={roleId}
                    value={role}
                    onChange={(event) => setRole(event.target.value as AppRole)}
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </ShiftSelect>
                </ShiftField>
                <ShiftField label="Position" htmlFor={positionIdField}>
                  <ShiftSelect
                    id={positionIdField}
                    value={positionId}
                    onChange={(event) => setPositionId(event.target.value)}
                    required
                  >
                    {activePositions.length === 0 ? (
                      <option value="">No positions defined</option>
                    ) : null}
                    {activePositions.map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name}
                      </option>
                    ))}
                  </ShiftSelect>
                </ShiftField>
              </div>
              {selectedPosition ? (
                <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      positionColorClasses(selectedPosition.color).dot,
                    )}
                  />
                  Schedules and reports use{" "}
                  <span className="font-medium text-foreground">{selectedPosition.name}</span>{" "}
                  shifts for this employee.
                </div>
              ) : null}
              {onOpenSettings ? (
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-opacity hover:opacity-80"
                >
                  Manage positions in Settings
                  <ExternalLinkIcon className="size-3.5" />
                </button>
              ) : null}
            </ShiftFormSection>

            <ShiftFormSection title="Station PIN">
              <ShiftField label="4-digit PIN" htmlFor={pinId}>
                <div className="flex gap-2">
                  <Input
                    id={pinId}
                    value={pin}
                    onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    className="font-mono tabular-nums"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Generate PIN"
                    onClick={() => setPin(randomPin())}
                  >
                    <RefreshCwIcon />
                  </Button>
                </div>
              </ShiftField>
              <p className="text-xs text-muted-foreground">
                Employees use this at the clock-in station. Hover a PIN in the table to reveal it,
                or click to copy.
              </p>
            </ShiftFormSection>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || !positionId || activePositions.length === 0}>
            {saving ? "Saving…" : mode === "create" ? "Add employee" : "Save changes"}
          </Button>
        </footer>
      </form>
    </div>
  );
}
