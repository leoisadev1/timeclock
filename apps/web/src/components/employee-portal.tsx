import { LocationSwitcher } from "@/components/location-switcher";
import {
  describeClockAction,
  getEmployeePortal,
  getLocations,
  getNextStatus,
  warningLabel,
} from "@/lib/timeclock-adapter";
import type {
  EmployeePortal as EmployeePortalData,
  LocationId,
  PunchAction,
  TimecardStatus,
} from "@/lib/timeclock-types";
import { api } from "@timeclock/backend/convex/_generated/api";
import type { Id } from "@timeclock/backend/convex/_generated/dataModel";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import { Skeleton } from "@timeclock/ui/components/skeleton";
import { useMutation, useQuery } from "convex/react";
import { CalendarDaysIcon, Clock3Icon, LogOutIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Unified location shape ────────────────────────────────────────────────

type ConvexLocation = {
  id: Id<"locations">;
  name: string;
  isConvex: true;
};

type DemoLocation = {
  id: LocationId;
  name: string;
  isConvex: false;
};

type UnifiedLocation = ConvexLocation | DemoLocation;

// ─── Convex employee shape (from getByPinForLocation) ─────────────────────

type ConvexEmployee = {
  id: Id<"employees">;
  displayName: string;
  avatarUrl?: string | null;
  positionName: string | null;
  role: "admin" | "manager" | "employee";
};

// ─── Session: either Convex or demo ───────────────────────────────────────

type ConvexSession = {
  kind: "convex";
  employee: ConvexEmployee;
  locationId: Id<"locations">;
};

type DemoSession = {
  kind: "demo";
  portal: EmployeePortalData;
  status: TimecardStatus;
};

type Session = ConvexSession | DemoSession;

// ─── PIN Keypad ────────────────────────────────────────────────────────────

function PinKeypad({
  pin,
  onKey,
  error,
}: {
  pin: string;
  onKey: (key: string) => void;
  error?: string;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "→"] as const;

  return (
    <div className="grid gap-3">
      <div className="flex justify-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`flex size-12 items-center justify-center rounded-2xl text-xl font-mono ring-2 transition-[background-color,ring-color] duration-150 ${
              i < pin.length
                ? "bg-primary/10 text-primary ring-primary"
                : "bg-muted/30 ring-border"
            }`}
          >
            {i < pin.length ? "●" : ""}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {keys.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onKey(key)}
            disabled={key === "→" && pin.length !== 4}
            className={`flex h-12 items-center justify-center rounded-2xl text-sm font-semibold transition-[background-color,transform,opacity] duration-150 active:scale-[0.98] ${
              key === "→"
                ? pin.length === 4
                  ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  : "cursor-not-allowed bg-muted/40 text-muted-foreground opacity-50 ring-1 ring-border"
                : "bg-card text-foreground ring-1 ring-border hover:bg-muted/50"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Error */}
      {error ? (
        <Badge tone="danger" className="h-auto py-1 text-center">
          {error}
        </Badge>
      ) : null}
    </div>
  );
}

// ─── Demo hint chips ───────────────────────────────────────────────────────

function DemoHints({ onSelect }: { onSelect: (pin: string) => void }) {
  const demoLogin = useQuery(api.demo.getDemoLogin);

  if (!demoLogin?.employeePins?.length) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-1.5">
      <p className="text-xs text-muted-foreground">Demo employees:</p>
      <div className="flex flex-wrap gap-1">
        {demoLogin.employeePins.slice(0, 4).map((emp) => (
          <button
            key={emp.employeeId}
            type="button"
            onClick={() => onSelect(emp.pin)}
            className="flex items-center gap-1.5 rounded-xl bg-card px-2.5 py-1.5 text-xs font-medium ring-1 ring-border transition-colors duration-150 hover:bg-muted/50 active:scale-[0.98]"
          >
            {emp.avatarUrl ? (
              <img
                src={emp.avatarUrl}
                alt={emp.name}
                className="size-4 rounded-full object-cover"
              />
            ) : null}
            <span>{emp.name}</span>
            <span className="font-mono text-muted-foreground">{emp.pin}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Status helpers ────────────────────────────────────────────────────────

function convexStatusToLocal(
  status: "clocked_in" | "on_break" | "clocked_out",
): TimecardStatus {
  if (status === "clocked_in") return "clocked-in";
  if (status === "on_break") return "on-break";
  return "clocked-out";
}

function StatusBadge({ status }: { status: TimecardStatus }) {
  if (status === "clocked-in") return <Badge tone="success">Clocked in</Badge>;
  if (status === "on-break") return <Badge tone="warning">On break</Badge>;
  return <Badge tone="neutral">Clocked out</Badge>;
}

// ─── Punch button ──────────────────────────────────────────────────────────

function PunchButton({
  label,
  action,
  status,
  onPunch,
}: {
  label: string;
  action: PunchAction;
  status: TimecardStatus;
  onPunch: (action: PunchAction) => void;
}) {
  const disabled =
    (action === "clock-in" && status !== "clocked-out") ||
    (action === "start-break" && status !== "clocked-in") ||
    (action === "end-break" && status !== "on-break") ||
    (action === "clock-out" && status === "clocked-out");

  return (
    <Button
      size="lg"
      className="h-12 w-full transition-transform duration-150 active:scale-[0.98]"
      variant={disabled ? "outline" : "default"}
      disabled={disabled}
      onClick={() => onPunch(action)}
    >
      {label}
    </Button>
  );
}

// ─── Convex employee workspace ─────────────────────────────────────────────

function ConvexWorkspace({
  employee,
  locationId,
  onSignOut,
}: {
  employee: ConvexEmployee;
  locationId: Id<"locations">;
  onSignOut: () => void;
}) {
  const clockInMutation = useMutation(api.timecards.clockIn);
  const startBreakMutation = useMutation(api.timecards.startBreak);
  const endBreakMutation = useMutation(api.timecards.endBreak);
  const clockOutMutation = useMutation(api.timecards.clockOut);

  const currentStatus = useQuery(api.timecards.getCurrentStatus, {
    employeeId: employee.id,
    locationId,
  });

  const status: TimecardStatus = currentStatus
    ? convexStatusToLocal(currentStatus.status)
    : "clocked-out";

  async function punch(action: PunchAction) {
    try {
      if (action === "clock-in") {
        await clockInMutation({ employeeId: employee.id, locationId, source: "employee_web" });
      } else if (action === "start-break") {
        await startBreakMutation({ employeeId: employee.id, source: "employee_web" });
      } else if (action === "end-break") {
        await endBreakMutation({ employeeId: employee.id, source: "employee_web" });
      } else {
        await clockOutMutation({ employeeId: employee.id, source: "employee_web" });
      }
      toast.success(`${action.replace("-", " ")} recorded`);
    } catch {
      toast.error("Action failed. Please try again.");
    }
  }

  const initials = employee.displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const todayEvents = currentStatus?.openTimecard?.events ?? [];
  const todayTimecards = currentStatus?.todayTimecards ?? [];

  return (
    <div className="grid animate-in fade-in-0 slide-in-from-bottom-1 gap-4 duration-200">
      <div className="grid gap-3 rounded-xl bg-card p-4 shadow-sm ring-1 ring-border md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex items-center gap-3">
          {employee.avatarUrl ? (
            <img
              src={employee.avatarUrl}
              alt={employee.displayName}
              className="size-12 rounded-full object-cover"
            />
          ) : (
            <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {initials}
            </span>
          )}
          <div>
            <h2 className="text-lg font-semibold">{employee.displayName}</h2>
            <p className="text-xs text-muted-foreground">{employee.positionName ?? employee.role}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {currentStatus ? <StatusBadge status={status} /> : <Skeleton className="h-5 w-20" />}
          <Button variant="outline" onClick={onSignOut}>
            <LogOutIcon /> Sign out
          </Button>
        </div>
      </div>

      {/* Punch buttons */}
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        <PunchButton label="Clock in" action="clock-in" status={status} onPunch={punch} />
        <PunchButton label="Start break" action="start-break" status={status} onPunch={punch} />
        <PunchButton label="End break" action="end-break" status={status} onPunch={punch} />
        <PunchButton label="Clock out" action="clock-out" status={status} onPunch={punch} />
      </div>

      {/* Today's events + recent history */}
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border">
          <div className="bg-muted/30 px-3 py-2.5">
            <h2 className="text-sm font-medium">Today's events</h2>
          </div>
          <div className="divide-y divide-border/60">
            {todayEvents.length ? (
              todayEvents.map((event) => (
                <div
                  key={event.id}
                  className="px-3 py-2.5 text-xs transition-colors duration-150 hover:bg-muted/20"
                >
                  <p className="font-medium capitalize">{event.type.replace(/_/g, " ")}</p>
                  <p className="text-muted-foreground">
                    {new Date(event.occurredAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}{" "}
                    via {event.source.replace(/_/g, " ")}
                  </p>
                </div>
              ))
            ) : (
              <p className="px-3 py-3 text-xs text-muted-foreground">No events yet today.</p>
            )}
          </div>
        </div>
        <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border">
          <div className="bg-muted/30 px-3 py-2.5">
            <h2 className="text-sm font-medium">Recent history</h2>
          </div>
          <div className="divide-y divide-border/60">
            {todayTimecards.length ? (
              todayTimecards.map((tc) => (
                <div
                  key={tc.id}
                  className="px-3 py-2.5 text-xs transition-colors duration-150 hover:bg-muted/20"
                >
                  <p className="font-medium">{tc.businessDate}</p>
                  <p className="text-muted-foreground">
                    {new Date(tc.clockInAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}{" "}
                    to{" "}
                    {tc.clockOutAt
                      ? new Date(tc.clockOutAt).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })
                      : "open"}{" "}
                    · {tc.workedHours.toFixed(1)}h
                  </p>
                </div>
              ))
            ) : (
              <p className="px-3 py-3 text-xs text-muted-foreground">No timecards today.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Demo employee workspace ───────────────────────────────────────────────

function DemoWorkspace({
  portal,
  status,
  onPunch,
  onSignOut,
}: {
  portal: EmployeePortalData;
  status: TimecardStatus;
  onPunch: (action: PunchAction) => void;
  onSignOut: () => void;
}) {
  return (
    <div className="grid animate-in fade-in-0 slide-in-from-bottom-1 gap-4 duration-200">
      <div className="grid gap-3 rounded-xl bg-card p-4 shadow-sm ring-1 ring-border md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex items-center gap-3">
          <span
            className={`grid size-12 place-items-center rounded-full ${portal.employee.avatarColor} text-sm font-semibold text-white`}
          >
            {portal.employee.initials}
          </span>
          <div>
            <h2 className="text-lg font-semibold">{portal.employee.name}</h2>
            <p className="text-xs text-muted-foreground">
              {portal.location.name} · {portal.employee.position}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={status} />
          <Button variant="outline" onClick={onSignOut}>
            <LogOutIcon /> Sign out
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
        <PunchButton label="Clock in" action="clock-in" status={status} onPunch={onPunch} />
        <PunchButton label="Start break" action="start-break" status={status} onPunch={onPunch} />
        <PunchButton label="End break" action="end-break" status={status} onPunch={onPunch} />
        <PunchButton label="Clock out" action="clock-out" status={status} onPunch={onPunch} />
      </div>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border">
          <div className="flex items-center gap-2 bg-muted/30 px-3 py-2.5">
            <CalendarDaysIcon className="size-4 text-muted-foreground" strokeWidth={1.8} />
            <h2 className="text-sm font-medium">Published schedule</h2>
          </div>
          <div className="divide-y divide-border/60">
            {portal.assignedShifts.map((shift) => {
              const warning = warningLabel(shift.warning);
              return (
                <div
                  key={shift.id}
                  className="grid gap-2 px-3 py-3 transition-colors duration-150 hover:bg-muted/20 sm:grid-cols-[110px_minmax(0,1fr)_auto]"
                >
                  <p className="text-xs font-semibold">{shift.day}</p>
                  <p className="text-xs text-muted-foreground">
                    {shift.start} – {shift.end} · {shift.position}
                  </p>
                  <div className="flex gap-1">
                    {shift.overnight ? <Badge tone="info">Overnight</Badge> : null}
                    {warning ? <Badge tone="warning">{warning}</Badge> : null}
                  </div>
                </div>
              );
            })}
            {portal.openShifts.map((shift) => (
              <div
                key={shift.id}
                className="grid gap-2 px-3 py-3 transition-colors duration-150 hover:bg-muted/20 sm:grid-cols-[110px_minmax(0,1fr)_auto]"
              >
                <p className="text-xs font-semibold">{shift.day}</p>
                <p className="text-xs">
                  {shift.start} – {shift.end} · {shift.position}
                </p>
                <Badge tone="warning">Open read-only</Badge>
              </div>
            ))}
            {portal.assignedShifts.length === 0 && portal.openShifts.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">No published shifts found.</p>
            ) : null}
          </div>
        </div>

        <aside className="grid gap-4 content-start">
          <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border">
            <div className="bg-muted/30 px-3 py-2.5">
              <h2 className="text-sm font-medium">Today's events</h2>
            </div>
            <div className="divide-y divide-border/60">
              {portal.todayEvents.length ? (
                portal.todayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="px-3 py-2.5 text-xs transition-colors duration-150 hover:bg-muted/20"
                  >
                    <p className="font-medium capitalize">
                      {event.action.replace(/-/g, " ")}
                    </p>
                    <p className="text-muted-foreground">
                      {event.time} via {event.source.replace(/_/g, " ")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="px-3 py-3 text-xs text-muted-foreground">No events yet today.</p>
              )}
            </div>
          </div>
          <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border">
            <div className="bg-muted/30 px-3 py-2.5">
              <h2 className="text-sm font-medium">Recent history</h2>
            </div>
            <div className="divide-y divide-border/60">
              {portal.recentHistory.map((timecard) => (
                <div
                  key={timecard.id}
                  className="px-3 py-2.5 text-xs transition-colors duration-150 hover:bg-muted/20"
                >
                  <p className="font-medium">{timecard.businessDate}</p>
                  <p className="text-muted-foreground">
                    {timecard.clockIn ?? "--"} to {timecard.clockOut ?? "open"} ·{" "}
                    {timecard.attendance}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

// ─── PIN panel ─────────────────────────────────────────────────────────────

function PinPanel({
  locations,
  locationId,
  onLocationChange,
  onSession,
}: {
  locations: UnifiedLocation[];
  locationId: string;
  onLocationChange: (id: string) => void;
  onSession: (session: Session) => void;
}) {
  const [pin, setPin] = useState("");
  const [submittedPin, setSubmittedPin] = useState("");
  const [error, setError] = useState<string | undefined>();

  const selectedLocation = locations.find((l) => l.id === locationId);
  const hasConvex = selectedLocation?.isConvex ?? false;

  // Convex query — only runs when hasConvex and submittedPin is 4 digits
  const convexEmployee = useQuery(
    api.employees.getByPinForLocation,
    hasConvex && submittedPin.length === 4
      ? { locationId: locationId as Id<"locations">, pin: submittedPin }
      : "skip",
  );

  // React to Convex query result
  const isLoading = hasConvex && submittedPin.length === 4 && convexEmployee === undefined;

  // When Convex resolves
  if (hasConvex && submittedPin.length === 4 && convexEmployee !== undefined) {
    if (convexEmployee) {
      // Found — create session (will be handled by parent via onSession)
      // We call onSession once; guard against re-calling on re-renders using the pin match
    }
  }

  function handleKey(key: string) {
    if (key === "⌫") {
      setPin((prev) => prev.slice(0, -1));
      setError(undefined);
      return;
    }
    if (key === "→") {
      if (pin.length === 4) {
        submitPin(pin);
      }
      return;
    }
    setPin((prev) => (prev + key).slice(0, 4));
    setError(undefined);
  }

  function submitPin(submitting: string) {
    setError(undefined);
    if (hasConvex) {
      setSubmittedPin(submitting);
      // The useQuery above will fire; we need to watch the result
      // We set submittedPin and the effect below handles session creation
    } else {
      // Demo path
      const result = getEmployeePortal(submitting, locationId as LocationId);
      if ("employee" in result) {
        toast.success(`${result.employee.name} signed in`);
        onSession({ kind: "demo", portal: result, status: result.status });
        setPin("");
        setSubmittedPin("");
      } else {
        setError(result.errors[0]);
      }
    }
  }

  // Handle Convex result after query resolves
  // We use a derived variable + render-time effect pattern (no useEffect needed,
  // since Convex is reactive — we just detect the transition in render)
  const convexResolved = hasConvex && submittedPin.length === 4 && convexEmployee !== undefined;

  if (convexResolved) {
    if (convexEmployee) {
      // Schedule session creation after render via timeout 0 to avoid setState during render
      setTimeout(() => {
        onSession({
          kind: "convex",
          employee: {
            id: convexEmployee.id as Id<"employees">,
            displayName: convexEmployee.displayName,
            avatarUrl: convexEmployee.avatarUrl,
            positionName: convexEmployee.positionName,
            role: convexEmployee.role,
          },
          locationId: locationId as Id<"locations">,
        });
        setPin("");
        setSubmittedPin("");
        toast.success(`${convexEmployee.displayName} signed in`);
      }, 0);
    } else if (!error) {
      setTimeout(() => {
        setError("Wrong PIN or not assigned to this location.");
        setSubmittedPin("");
      }, 0);
    }
  }

  // Build LocationSwitcher-compatible location list (demo shape)
  const demoLocations = getLocations();

  return (
    <div className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-border">
      <h2 className="text-sm font-semibold tracking-tight">Enter your PIN</h2>

      <div className="mt-3 mb-4">
        <LocationSwitcher
          locations={demoLocations}
          value={(locationId as LocationId) || demoLocations[0]?.id}
          onChange={(id) => {
            onLocationChange(id);
            setPin("");
            setSubmittedPin("");
            setError(undefined);
          }}
        />
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          <div className="flex justify-center gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="size-12" />
            ))}
          </div>
          <Skeleton className="h-10 w-full" />
          <p className="text-center text-xs text-muted-foreground">Looking up PIN…</p>
        </div>
      ) : (
        <PinKeypad pin={pin} onKey={handleKey} error={error} />
      )}

      <DemoHints onSelect={(p) => setPin(p)} />
    </div>
  );
}

// ─── Root component ────────────────────────────────────────────────────────

export function EmployeePortal() {
  const convexLocations = useQuery(api.locations.listForCurrentUser);
  const demoLocations = getLocations();

  const hasConvex = Array.isArray(convexLocations) && convexLocations.length > 0;

  const locations: UnifiedLocation[] = hasConvex
    ? convexLocations
        .filter((l): l is NonNullable<typeof l> => l !== null)
        .map((l) => ({ id: l.id, name: l.name, isConvex: true as const }))
    : demoLocations.map((l) => ({ id: l.id, name: l.name, isConvex: false as const }));

  const [locationId, setLocationId] = useState<string>(
    () => locations[0]?.id ?? "loc-downtown",
  );

  const [session, setSession] = useState<Session | undefined>();

  function handlePunch(action: PunchAction) {
    if (!session || session.kind !== "demo") return;
    const next = getNextStatus(session.status, action);
    const fakeEmployee = session.portal.employee;
    setSession({ ...session, status: next });
    toast.success(describeClockAction(fakeEmployee, action, "employee_web"));
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge tone="primary">Employee web</Badge>
            <h1 className="mt-2 text-xl font-semibold tracking-tight">Employee Sign In</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Sign in with your PIN to clock in, take breaks, and view your schedule.
            </p>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
          <PinPanel
            locations={locations}
            locationId={locationId}
            onLocationChange={setLocationId}
            onSession={(s) => setSession(s)}
          />

          {session ? (
            session.kind === "convex" ? (
              <ConvexWorkspace
                employee={session.employee}
                locationId={session.locationId}
                onSignOut={() => setSession(undefined)}
              />
            ) : (
              <DemoWorkspace
                portal={session.portal}
                status={session.status}
                onPunch={handlePunch}
                onSignOut={() => setSession(undefined)}
              />
            )
          ) : (
            <div className="grid min-h-80 place-items-center rounded-xl bg-muted/20 p-6 text-center ring-1 ring-border">
              <div>
                <Clock3Icon
                  className="mx-auto size-8 text-muted-foreground"
                  strokeWidth={1.8}
                />
                <p className="mt-3 text-sm font-medium">No employee signed in</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Use a valid active PIN assigned to this location.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
