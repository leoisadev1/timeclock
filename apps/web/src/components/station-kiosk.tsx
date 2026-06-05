import { EmployeeAvatar } from "@/components/employee-avatar";
import { LocationSwitcher } from "@/components/location-switcher";
import { PortalShell } from "@/components/portal-shell";
import { SamplePinHints } from "@/components/sample-pin-hints";
import {
  eventLabel,
  formatElapsed,
  markStationActivitySession,
  useLiveNow,
} from "@/components/station-activity";
import { usePortalLocations } from "@/hooks/use-portal-locations";
import {
  getEmployeePortal,
  getNextStatus,
} from "@/lib/timeclock-adapter";
import type { LocationId, PunchAction, TimecardStatus } from "@/lib/timeclock-types";
import { api } from "@timeclock/backend/convex/_generated/api";
import type { Id } from "@timeclock/backend/convex/_generated/dataModel";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import { Skeleton } from "@timeclock/ui/components/skeleton";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Live clock ───────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(() =>
    new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }),
  );

  useEffect(() => {
    const id = setInterval(() => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      );
    }, 15000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="text-3xl font-light tabular-nums tracking-tight text-foreground sm:text-4xl md:text-5xl">
      {time}
    </span>
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────

function convexStatusToLocal(status: "clocked_in" | "on_break" | "clocked_out"): TimecardStatus {
  if (status === "clocked_in") return "clocked-in";
  if (status === "on_break") return "on-break";
  return "clocked-out";
}

// ─── Station punch button ─────────────────────────────────────────────────

function StationPunch({
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
      className="min-h-14 w-full rounded-2xl text-base font-semibold transition-transform duration-150 active:scale-[0.98] md:min-h-16"
      variant={disabled ? "outline" : "default"}
      disabled={disabled}
      onClick={() => onPunch(action)}
    >
      {label}
    </Button>
  );
}

// ─── PIN keypad (station, large touch targets) ────────────────────────────

function StationPinKeypad({
  pin,
  onKey,
  error,
  isLoading,
}: {
  pin: string;
  onKey: (key: string) => void;
  error?: string;
  isLoading?: boolean;
}) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "⌫", "0", "→"] as const;

  return (
    <div className="grid gap-3">
      {/* PIN dots */}
      <div className="flex justify-center gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`flex size-14 items-center justify-center rounded-2xl text-2xl font-mono ring-2 transition-[background-color,ring-color] duration-150 md:size-16 md:text-3xl ${
              i < pin.length
                ? "bg-primary/10 text-primary ring-primary"
                : "bg-muted/30 ring-border"
            }`}
          >
            {i < pin.length ? "●" : ""}
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 4 }).map((_, r) => (
            <div key={r} className="grid grid-cols-3 gap-2">
              {Array.from({ length: 3 }).map((__, c) => (
                <Skeleton key={c} className="min-h-16 w-full opacity-20" />
              ))}
            </div>
          ))}
          <p className="text-center text-sm text-muted-foreground">Looking up PIN…</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 md:gap-3">
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onKey(key)}
              disabled={key === "→" && pin.length !== 4}
              className={`flex min-h-14 items-center justify-center rounded-2xl text-lg font-semibold transition-[background-color,transform,opacity] duration-150 active:scale-[0.98] md:min-h-16 md:text-xl ${
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
      )}

      {error ? (
        <Badge tone="danger" className="h-auto w-full justify-center py-2 text-center">
          {error}
        </Badge>
      ) : null}
    </div>
  );
}

// ─── Convex employee panel ────────────────────────────────────────────────

function ConvexEmployeePanel({
  employeeId,
  displayName,
  avatarUrl,
  positionName,
  locationId,
  now,
  sessionStartedAt,
  onPunchComplete,
}: {
  employeeId: Id<"employees">;
  displayName: string;
  avatarUrl?: string | null;
  positionName: string | null;
  locationId: Id<"locations">;
  now: number;
  sessionStartedAt: number;
  onPunchComplete: () => void;
}) {
  const clockInMutation = useMutation(api.timecards.clockIn);
  const startBreakMutation = useMutation(api.timecards.startBreak);
  const endBreakMutation = useMutation(api.timecards.endBreak);
  const clockOutMutation = useMutation(api.timecards.clockOut);

  const currentStatus = useQuery(api.timecards.getCurrentStatus, {
    employeeId,
    locationId,
  });

  const status: TimecardStatus = currentStatus
    ? convexStatusToLocal(currentStatus.status)
    : "clocked-out";
  const activeStartedAt = status === "clocked-out" ? undefined : sessionStartedAt;
  const events =
    currentStatus?.openTimecard?.events.filter((event) => event.occurredAt >= sessionStartedAt - 1000) ?? [];

  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  async function punch(action: PunchAction) {
    try {
      if (action === "clock-in") {
        await clockInMutation({ employeeId, locationId, source: "station" });
        markStationActivitySession(locationId, Date.now());
      } else if (action === "start-break") {
        await startBreakMutation({ employeeId, source: "station" });
      } else if (action === "end-break") {
        await endBreakMutation({ employeeId, source: "station" });
      } else {
        await clockOutMutation({ employeeId, source: "station" });
      }
      toast.success(`${action.replace("-", " ")} saved for ${displayName}`);
      if (action === "clock-out") {
        onPunchComplete();
      }
    } catch {
      toast.error("Action failed. Please try again.");
    }
  }

  return (
    <div className="grid animate-in fade-in-0 slide-in-from-bottom-2 gap-4 duration-200 content-start">
      <div className="rounded-xl bg-muted/20 p-4 ring-1 ring-border md:p-5">
        <div className="flex items-center gap-4">
          <EmployeeAvatar
            name={displayName}
            initials={initials}
            avatarColor="bg-primary"
            avatarUrl={avatarUrl}
            employeeId={employeeId}
            size="xl"
          />
          <div>
            <h2 className="text-xl font-semibold md:text-2xl">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{positionName ?? "Employee"}</p>
            {currentStatus ? (
              <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                {status.replace("-", " ")}
              </p>
            ) : (
              <Skeleton className="mt-2 h-4 w-24" />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-xl bg-muted/20 p-4 ring-1 ring-border md:p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Session timer
            </p>
            <p className="mt-1 font-mono text-4xl font-semibold tabular-nums tracking-tight">
              {activeStartedAt
                ? formatElapsed(now - activeStartedAt, currentStatus?.openTimecard?.totalBreakMinutes ?? 0)
                : "0:00"}
            </p>
          </div>
          <Badge tone={status === "on-break" ? "warning" : status === "clocked-in" ? "success" : "neutral"}>
            {status.replace("-", " ")}
          </Badge>
        </div>
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Today events
          </p>
          {events.length > 0 ? (
            <div className="space-y-1">
              {events.slice().reverse().map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2 text-xs ring-1 ring-border">
                  <span>{eventLabel(event.type)}</span>
                  <span className="font-mono text-muted-foreground">
                    {new Date(event.occurredAt).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <StationPunch label="Clock in" action="clock-in" status={status} onPunch={punch} />
        <StationPunch label="Start break" action="start-break" status={status} onPunch={punch} />
        <StationPunch label="End break" action="end-break" status={status} onPunch={punch} />
        <StationPunch label="Clock out" action="clock-out" status={status} onPunch={punch} />
      </div>
    </div>
  );
}

// ─── Demo employee panel ──────────────────────────────────────────────────

function DemoEmployeePanel({
  displayName,
  initials,
  avatarColor,
  position,
  status,
  now,
  startedAt,
  onPunch,
}: {
  displayName: string;
  initials: string;
  avatarColor: string;
  position: string;
  status: TimecardStatus;
  now: number;
  startedAt: number;
  onPunch: (action: PunchAction) => void;
}) {
  return (
    <div className="grid animate-in fade-in-0 slide-in-from-bottom-2 gap-4 duration-200 content-start">
      <div className="rounded-xl bg-muted/20 p-4 ring-1 ring-border md:p-5">
        <div className="flex items-center gap-4">
          <EmployeeAvatar
            name={displayName}
            initials={initials}
            avatarColor={avatarColor}
            employeeId={displayName}
            size="xl"
          />
          <div>
            <h2 className="text-xl font-semibold md:text-2xl">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{position}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
              {status.replace("-", " ")}
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-muted/20 p-4 ring-1 ring-border md:p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Session timer
            </p>
            <p className="mt-1 font-mono text-4xl font-semibold tabular-nums tracking-tight">
              {status === "clocked-out" ? "0:00" : formatElapsed(now - startedAt)}
            </p>
          </div>
          <Badge tone={status === "on-break" ? "warning" : status === "clocked-in" ? "success" : "neutral"}>
            {status.replace("-", " ")}
          </Badge>
        </div>
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Today events
          </p>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-card px-3 py-2 text-xs ring-1 ring-border">
            <span>{status === "clocked-out" ? "Ready to clock in" : "PIN accepted"}</span>
            <span className="font-mono text-muted-foreground">
              {new Date(startedAt).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <StationPunch label="Clock in" action="clock-in" status={status} onPunch={onPunch} />
        <StationPunch label="Start break" action="start-break" status={status} onPunch={onPunch} />
        <StationPunch label="End break" action="end-break" status={status} onPunch={onPunch} />
        <StationPunch label="Clock out" action="clock-out" status={status} onPunch={onPunch} />
      </div>
    </div>
  );
}

// ─── Main StationKiosk ────────────────────────────────────────────────────

type ConvexEmployeeState = {
  kind: "convex";
  id: Id<"employees">;
  displayName: string;
  avatarUrl?: string | null;
  positionName: string | null;
  sessionStartedAt: number;
};

type DemoEmployeeState = {
  kind: "demo";
  displayName: string;
  initials: string;
  avatarColor: string;
  position: string;
  status: TimecardStatus;
  startedAt: number;
};

type EmployeeState = ConvexEmployeeState | DemoEmployeeState;

export function StationKiosk() {
  const {
    switcherLocations,
    locationId,
    setLocationId,
    hasConvex,
    selectedLocation,
  } = usePortalLocations();

  const [pin, setPin] = useState("");
  const [submittedPin, setSubmittedPin] = useState("");
  const [employee, setEmployee] = useState<EmployeeState | undefined>();
  const [error, setError] = useState<string | undefined>();
  const handledLookupRef = useRef<string | null>(null);
  const now = useLiveNow(1000);

  const convexEmployee = useQuery(
    api.employees.getByPinForLocation,
    hasConvex && submittedPin.length === 4
      ? { locationId: locationId as Id<"locations">, pin: submittedPin }
      : "skip",
  );

  const isLookingUp = hasConvex && submittedPin.length === 4 && convexEmployee === undefined;

  useEffect(() => {
    if (!hasConvex || submittedPin.length !== 4 || convexEmployee === undefined || employee) {
      return;
    }
    const lookupKey = `${locationId}:${submittedPin}`;
    if (handledLookupRef.current === lookupKey) {
      return;
    }
    handledLookupRef.current = lookupKey;

    if (convexEmployee) {
      setEmployee({
        kind: "convex",
        id: convexEmployee.id as Id<"employees">,
        displayName: convexEmployee.displayName,
        avatarUrl: convexEmployee.avatarUrl,
        positionName: convexEmployee.positionName,
        sessionStartedAt: Date.now(),
      });
      setPin("");
      setSubmittedPin("");
      setError(undefined);
      toast.success(`${convexEmployee.displayName} ready`);
      return;
    }

    setError("Wrong PIN or not assigned to this location.");
    setSubmittedPin("");
  }, [hasConvex, submittedPin, convexEmployee, locationId, employee]);

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
    if (pin.length < 4) {
      setPin((prev) => prev + key);
      setError(undefined);
    }
  }

  function submitPin(submitting: string) {
    setError(undefined);
    setEmployee(undefined);
    handledLookupRef.current = null;

    if (hasConvex) {
      setSubmittedPin(submitting);
    } else {
      // Demo path
      const result = getEmployeePortal(submitting, locationId as LocationId);
      if ("employee" in result) {
        setEmployee({
          kind: "demo",
          displayName: result.employee.name,
          initials: result.employee.initials,
          avatarColor: result.employee.avatarColor,
          position: result.employee.position,
          status: result.status,
          startedAt: Date.now(),
        });
        setPin("");
        setError(result.errors[0]);
        toast.success(`${result.employee.name} ready`);
      } else {
        setError(result.errors[0]);
      }
    }
  }

  function handleDemoPunch(action: PunchAction) {
    if (!employee || employee.kind !== "demo") return;
    const next = getNextStatus(employee.status, action);
    setEmployee({
      ...employee,
      status: next,
      startedAt: action === "clock-in" ? Date.now() : employee.startedAt,
    });
    toast.success(`${action.replace("-", " ")} saved for ${employee.displayName}`);
    setPin("");
    setSubmittedPin("");
  }

  function clearEmployee() {
    setEmployee(undefined);
    setPin("");
    setSubmittedPin("");
    setError(undefined);
    handledLookupRef.current = null;
  }

  const stationHeader = (
    <div className="flex w-full max-w-xs flex-col gap-2 sm:max-w-none sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <LocationSwitcher
          locations={switcherLocations}
          value={(locationId as LocationId) || switcherLocations[0]?.id}
          onChange={(id) => {
            setLocationId(id);
            clearEmployee();
          }}
          label="Station location"
        />
      </div>
    </div>
  );

  return (
    <PortalShell
      mode="station"
      title={selectedLocation?.name ?? "Clock-in station"}
      subtitle="Shared tablet for employee PIN entry and punch actions."
      headerActions={stationHeader}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 md:gap-5 lg:flex-row">
          <div className="shrink-0 lg:w-[min(100%,420px)]">
            <div className="mb-3 hidden md:block">
              <LiveClock />
              <p className="mt-1 text-xs text-muted-foreground">
                {selectedLocation?.name ?? "Select location"}
              </p>
            </div>
            <div className="overflow-hidden rounded-xl bg-muted/20 p-4 ring-1 ring-border md:p-5">
              <p className="mb-3 text-sm font-semibold">Enter employee PIN</p>
              <StationPinKeypad
                pin={pin}
                onKey={handleKey}
                error={error}
                isLoading={isLookingUp}
              />
              {!employee ? (
                <SamplePinHints
                  onSelect={(samplePin) => {
                    setPin(samplePin);
                    setError(undefined);
                  }}
                  enabled
                  convexLocationId={hasConvex ? (locationId as Id<"locations">) : undefined}
                  demoLocationId={!hasConvex ? (locationId as LocationId) : undefined}
                  limit={1}
                />
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1">
            {employee ? (
              employee.kind === "convex" ? (
                <ConvexEmployeePanel
                  employeeId={employee.id}
                  displayName={employee.displayName}
                  avatarUrl={employee.avatarUrl}
                  positionName={employee.positionName}
                  locationId={locationId as Id<"locations">}
                  now={now}
                  sessionStartedAt={employee.sessionStartedAt}
                  onPunchComplete={clearEmployee}
                />
              ) : (
                <DemoEmployeePanel
                  displayName={employee.displayName}
                  initials={employee.initials}
                  avatarColor={employee.avatarColor}
                  position={employee.position}
                  status={employee.status}
                  now={now}
                  startedAt={employee.startedAt}
                  onPunch={handleDemoPunch}
                />
              )
            ) : (
              <div className="grid min-h-[480px] place-items-center rounded-xl bg-muted/20 p-6 text-center ring-1 ring-border">
                <div>
                  <p className="text-lg font-semibold tracking-tight">Ready for employee PIN</p>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Enter the sample PIN, then clock in, start break, end break, or clock out.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
    </PortalShell>
  );
}
