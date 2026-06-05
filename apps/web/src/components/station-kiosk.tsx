import { LocationSwitcher } from "@/components/location-switcher";
import { PortalShell } from "@/components/portal-shell";
import { SamplePinHints } from "@/components/sample-pin-hints";
import { usePortalLocations } from "@/hooks/use-portal-locations";
import {
  describeClockAction,
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
import { LockKeyholeIcon, ShieldCheckIcon } from "lucide-react";
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
  onPunchComplete,
}: {
  employeeId: Id<"employees">;
  displayName: string;
  avatarUrl?: string | null;
  positionName: string | null;
  locationId: Id<"locations">;
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
      } else if (action === "start-break") {
        await startBreakMutation({ employeeId, source: "station" });
      } else if (action === "end-break") {
        await endBreakMutation({ employeeId, source: "station" });
      } else {
        await clockOutMutation({ employeeId, source: "station" });
      }
      toast.success(`${action.replace("-", " ")} saved for ${displayName}`);
      onPunchComplete();
    } catch {
      toast.error("Action failed. Please try again.");
    }
  }

  return (
    <div className="grid animate-in fade-in-0 slide-in-from-bottom-2 gap-4 duration-200 content-start">
      <div className="rounded-xl bg-muted/20 p-4 ring-1 ring-border md:p-5">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="size-14 rounded-full object-cover md:size-16"
            />
          ) : (
            <span className="grid size-14 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary md:size-16 md:text-xl">
              {initials}
            </span>
          )}
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
  onPunch,
}: {
  displayName: string;
  initials: string;
  avatarColor: string;
  position: string;
  status: TimecardStatus;
  onPunch: (action: PunchAction) => void;
}) {
  return (
    <div className="grid animate-in fade-in-0 slide-in-from-bottom-2 gap-4 duration-200 content-start">
      <div className="rounded-xl bg-muted/20 p-4 ring-1 ring-border md:p-5">
        <div className="flex items-center gap-4">
          <span
            className={`grid size-14 place-items-center rounded-full md:size-16 ${avatarColor} text-lg font-semibold text-white md:text-xl`}
          >
            {initials}
          </span>
          <div>
            <h2 className="text-xl font-semibold md:text-2xl">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{position}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
              {status.replace("-", " ")}
            </p>
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
};

type DemoEmployeeState = {
  kind: "demo";
  displayName: string;
  initials: string;
  avatarColor: string;
  position: string;
  status: TimecardStatus;
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

  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [submittedPin, setSubmittedPin] = useState("");
  const [employee, setEmployee] = useState<EmployeeState | undefined>();
  const [error, setError] = useState<string | undefined>();
  const handledLookupRef = useRef<string | null>(null);

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
    // Build a minimal Employee-like object for describeClockAction
    const fakeEmployee = {
      name: employee.displayName,
      initials: employee.initials,
      avatarColor: employee.avatarColor,
      id: "emp-maya" as const,
      pin: "",
      role: "employee" as const,
      position: employee.position as "Barista",
      active: true,
      assignedLocationIds: [],
    };
    setEmployee({ ...employee, status: next });
    toast.success(describeClockAction(fakeEmployee, action, "station"));
    setPin("");
    setSubmittedPin("");
    setEmployee(undefined);
  }

  function clearEmployee() {
    setEmployee(undefined);
    setPin("");
    setSubmittedPin("");
    setError(undefined);
    handledLookupRef.current = null;
  }

  function lockStation() {
    setUnlocked(false);
    clearEmployee();
  }

  const stationHeader = unlocked ? (
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
      <Button variant="outline" size="sm" onClick={lockStation}>
        <LockKeyholeIcon className="size-4" />
        Lock
      </Button>
    </div>
  ) : null;

  return (
    <PortalShell
      mode="station"
      title={unlocked ? selectedLocation?.name ?? "Clock-in station" : "Clock-in station"}
      subtitle={
        unlocked
          ? "Shared tablet for employee PIN entry and punch actions."
          : "Unlock once per shift so the team can record time at this location."
      }
      headerActions={stationHeader}
    >
      {!unlocked ? (
        <div className="grid min-h-[50vh] place-items-center p-4 md:min-h-[60vh]">
          <div className="w-full max-w-md rounded-xl bg-muted/20 p-6 text-center ring-1 ring-border md:p-8">
            <LockKeyholeIcon className="mx-auto size-10 text-muted-foreground" strokeWidth={1.6} />
            <h2 className="mt-4 text-lg font-semibold tracking-tight">Manager unlock</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Unlock this shared screen so employees at this location can record their time.
            </p>
            <Button
              className="mt-6 h-12 w-full rounded-2xl transition-transform duration-150 active:scale-[0.98] md:h-14"
              onClick={() => setUnlocked(true)}
            >
              <ShieldCheckIcon className="size-4" /> Unlock station
            </Button>
          </div>
        </div>
      ) : (
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
                  enabled={unlocked}
                  convexLocationId={hasConvex ? (locationId as Id<"locations">) : undefined}
                  demoLocationId={!hasConvex ? (locationId as LocationId) : undefined}
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
                  onPunchComplete={clearEmployee}
                />
              ) : (
                <DemoEmployeePanel
                  displayName={employee.displayName}
                  initials={employee.initials}
                  avatarColor={employee.avatarColor}
                  position={employee.position}
                  status={employee.status}
                  onPunch={handleDemoPunch}
                />
              )
            ) : (
              <div className="grid min-h-48 place-items-center rounded-xl bg-muted/20 p-6 text-center ring-1 ring-border md:min-h-full">
                <div>
                  <p className="text-lg font-semibold tracking-tight">Ready for a PIN</p>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Employees assigned to this location can clock in, take breaks, or clock out
                    here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PortalShell>
  );
}
