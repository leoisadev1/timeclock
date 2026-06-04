import { LocationSwitcher } from "@/components/location-switcher";
import {
  describeClockAction,
  getEmployeePortal,
  getLocations,
  getNextStatus,
} from "@/lib/timeclock-adapter";
import type { LocationId, PunchAction, TimecardStatus } from "@/lib/timeclock-types";
import { api } from "@timeclock/backend/convex/_generated/api";
import type { Id } from "@timeclock/backend/convex/_generated/dataModel";
import { Button } from "@timeclock/ui/components/button";
import { Skeleton } from "@timeclock/ui/components/skeleton";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { ClockIcon, LockKeyholeIcon, ShieldCheckIcon } from "lucide-react";
import { useEffect, useState } from "react";
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
    <span className="text-5xl font-light tabular-nums tracking-tight">{time}</span>
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────

function convexStatusToLocal(
  status: "clocked_in" | "on_break" | "clocked_out",
): TimecardStatus {
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
      className="min-h-16 w-full text-sm font-semibold"
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
      <div className="flex justify-center gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`flex size-14 items-center justify-center border-2 text-2xl font-mono transition-[border-color,background-color] duration-100 ${
              i < pin.length
                ? "border-background bg-background/10 text-background"
                : "border-background/30 bg-background/5"
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
          <p className="text-center text-sm text-background/60">Looking up PIN…</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {keys.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => onKey(key)}
              disabled={key === "→" && pin.length !== 4}
              className={`flex min-h-16 items-center justify-center border text-lg font-semibold transition-[background-color,transform] duration-100 active:translate-y-px ${
                key === "→"
                  ? pin.length === 4
                    ? "border-background bg-background text-foreground hover:bg-background/90"
                    : "cursor-not-allowed border-background/20 opacity-30"
                  : "border-background/20 hover:bg-background/10"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      )}

      {error ? (
        <div className="border border-orange-400/40 bg-orange-400/10 px-3 py-2 text-center text-sm text-orange-300">
          {error}
        </div>
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
      toast.success(`${action.replace("-", " ")} recorded for ${displayName}`);
      onPunchComplete();
    } catch {
      toast.error("Action failed. Please try again.");
    }
  }

  return (
    <div className="grid gap-4 content-start animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      {/* Employee header */}
      <div className="border border-background/20 p-5">
        <div className="flex items-center gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="size-16 rounded-full object-cover"
            />
          ) : (
            <span className="grid size-16 place-items-center rounded-full bg-background/10 text-xl font-semibold">
              {initials}
            </span>
          )}
          <div>
            <h2 className="text-2xl font-semibold">{displayName}</h2>
            <p className="text-sm text-background/70">{positionName ?? "Employee"}</p>
            {currentStatus ? (
              <p className="mt-2 text-xs uppercase tracking-wide text-background/60">
                {status.replace("-", " ")}
              </p>
            ) : (
              <Skeleton className="mt-2 h-4 w-24 opacity-20" />
            )}
          </div>
        </div>
      </div>

      {/* Punch buttons */}
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
    <div className="grid gap-4 content-start animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
      <div className="border border-background/20 p-5">
        <div className="flex items-center gap-4">
          <span
            className={`grid size-16 place-items-center rounded-full ${avatarColor} text-xl font-semibold text-white`}
          >
            {initials}
          </span>
          <div>
            <h2 className="text-2xl font-semibold">{displayName}</h2>
            <p className="text-sm text-background/70">{position}</p>
            <p className="mt-2 text-xs uppercase tracking-wide text-background/60">
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
  const convexLocations = useQuery(api.locations.listForCurrentUser);
  const demoLocations = getLocations();

  const hasConvex = Array.isArray(convexLocations) && convexLocations.length > 0;

  const locations = hasConvex
    ? convexLocations
        .filter((l): l is NonNullable<typeof l> => l !== null)
        .map((l) => ({ id: l.id, name: l.name, isConvex: true as const }))
    : demoLocations.map((l) => ({ id: l.id, name: l.name, isConvex: false as const }));

  const [unlocked, setUnlocked] = useState(false);
  const [locationId, setLocationId] = useState<string>(() => locations[0]?.id ?? "loc-downtown");
  const [pin, setPin] = useState("");
  const [submittedPin, setSubmittedPin] = useState("");
  const [employee, setEmployee] = useState<EmployeeState | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [exitConfirm, setExitConfirm] = useState(false);

  const selectedLocation = locations.find((l) => l.id === locationId);
  const isConvexLocation = selectedLocation?.isConvex ?? false;

  // Convex PIN lookup
  const convexEmployee = useQuery(
    api.employees.getByPinForLocation,
    isConvexLocation && submittedPin.length === 4
      ? { locationId: locationId as Id<"locations">, pin: submittedPin }
      : "skip",
  );

  const isLookingUp = isConvexLocation && submittedPin.length === 4 && convexEmployee === undefined;

  // React to Convex result
  const convexResolved =
    isConvexLocation && submittedPin.length === 4 && convexEmployee !== undefined;

  if (convexResolved && !employee) {
    if (convexEmployee) {
      setTimeout(() => {
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
      }, 0);
    } else if (!error) {
      setTimeout(() => {
        setError("Wrong PIN or not assigned to this location.");
        setSubmittedPin("");
      }, 0);
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
    if (pin.length < 4) {
      setPin((prev) => prev + key);
      setError(undefined);
    }
  }

  function submitPin(submitting: string) {
    setError(undefined);
    setEmployee(undefined);

    if (isConvexLocation) {
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
  }

  // Build demo location list for LocationSwitcher (it only accepts demo Location[])
  const switcherLocations = demoLocations;

  return (
    <main className="min-h-svh bg-foreground p-3 text-background">
      <div className="mx-auto grid min-h-[calc(100svh-1.5rem)] max-w-6xl grid-rows-[auto_minmax(0,1fr)] border border-background/20 bg-foreground">

        {/* Header */}
        <header className="flex flex-col gap-3 border-b border-background/20 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <ClockIcon className="size-6 text-background/60" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-background/60">
                {selectedLocation?.name ?? "Location clock station"}
              </p>
              {unlocked ? <LiveClock /> : (
                <h1 className="text-xl font-semibold">Location Clock Station</h1>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {unlocked ? (
              <LocationSwitcher
                locations={switcherLocations}
                value={(locationId as LocationId) || switcherLocations[0]?.id}
                onChange={(id) => {
                  setLocationId(id);
                  clearEmployee();
                }}
                label="Station location"
              />
            ) : null}
            <Button
              variant="outline"
              className="border-background/20 text-background hover:bg-background/10"
              onClick={() => setExitConfirm(true)}
            >
              Exit station
            </Button>
          </div>
        </header>

        {/* Body */}
        {!unlocked ? (
          <section className="grid place-items-center p-6">
            <div className="w-full max-w-md border border-background/20 p-6 text-center">
              <LockKeyholeIcon className="mx-auto size-10" strokeWidth={1.6} />
              <h2 className="mt-4 text-lg font-semibold">Manager unlock</h2>
              <p className="mt-2 text-xs text-background/70">
                Demo unlock placeholder while manager authenticated station handoff is completed.
              </p>
              <Button
                className="mt-5 h-11 w-full"
                onClick={() => setUnlocked(true)}
              >
                <ShieldCheckIcon /> Unlock station
              </Button>
            </div>
          </section>
        ) : (
          <section className="grid gap-4 p-4 lg:grid-cols-[400px_minmax(0,1fr)]">
            {/* PIN entry */}
            <div className="grid gap-3 content-start">
              <div className="border border-background/20 p-4">
                <p className="mb-3 text-sm font-semibold text-background/80">Employee PIN</p>
                <StationPinKeypad
                  pin={pin}
                  onKey={handleKey}
                  error={error}
                  isLoading={isLookingUp}
                />
              </div>
            </div>

            {/* Employee actions or empty state */}
            <div className="grid content-start gap-4">
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
                <div className="grid min-h-80 place-items-center border border-background/20 p-6 text-center">
                  <div>
                    <p className="text-lg font-semibold">Enter PIN</p>
                    <p className="mt-2 text-sm text-background/70">
                      Active employees assigned to this location can punch here.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Exit confirm modal */}
      {exitConfirm ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/80 p-4">
          <div className="animate-in fade-in-0 slide-in-from-bottom-2 duration-200 w-full max-w-sm border border-background/20 bg-foreground p-5 text-background">
            <h2 className="text-lg font-semibold">Exit station mode?</h2>
            <p className="mt-2 text-xs text-background/70">
              Manager confirmation is required before returning to normal navigation.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                className="border-background/20 text-background hover:bg-background/10"
                onClick={() => setExitConfirm(false)}
              >
                Stay
              </Button>
              <Link
                to="/"
                className="inline-flex h-8 items-center justify-center border border-background bg-background px-2.5 text-xs font-medium text-foreground"
              >
                Exit
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
