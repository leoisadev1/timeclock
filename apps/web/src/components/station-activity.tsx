import { EmployeeAvatar } from "@/components/employee-avatar";
import { LocationSwitcher } from "@/components/location-switcher";
import { PortalShell } from "@/components/portal-shell";
import { usePortalLocations } from "@/hooks/use-portal-locations";
import type { LocationId } from "@/lib/timeclock-types";
import { api } from "@timeclock/backend/convex/_generated/api";
import type { Id } from "@timeclock/backend/convex/_generated/dataModel";
import { Badge } from "@timeclock/ui/components/badge";
import { Skeleton } from "@timeclock/ui/components/skeleton";
import { useQuery } from "convex/react";
import {
  CoffeeIcon,
  LogInIcon,
  LogOutIcon,
  RadioIcon,
  TimerIcon,
  UtensilsIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

type StationStatus = "clocked_in" | "on_break" | "clocked_out" | "clocked-in" | "on-break" | "clocked-out";
type StationEventType = "clock_in" | "start_break" | "end_break" | "clock_out" | "clock-in" | "start-break" | "end-break" | "clock-out" | "manager_edit";

export type StationActivityEmployee = {
  timecardId: string;
  employeeId: string;
  displayName: string;
  initials?: string;
  avatarColor?: string;
  avatarUrl?: string | null;
  positionName?: string | null;
  status: StationStatus;
  clockInAt?: number;
  clockOutAt?: number | null;
  clockIn?: string | null;
  clockOut?: string | null;
  totalBreakMinutes: number;
  workedHours?: number;
};

export type StationActivityEvent = {
  eventId: string;
  employeeId: string;
  displayName: string;
  initials?: string;
  avatarColor?: string;
  avatarUrl?: string | null;
  type: StationEventType;
  occurredAt?: number;
  time?: string;
  source: string;
};

export type StationActivityData = {
  locationId: string;
  locationName: string;
  timezone: string;
  businessDate: string;
  onClock: StationActivityEmployee[];
  recentEvents: StationActivityEvent[];
  quickCounts: {
    onClock: number;
    clockedIn: number;
    onBreak: number;
    clockedOut: number;
  };
};

export function useLiveNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}

export function useStationActivity(locationId: string, hasConvex: boolean) {
  const convexActivity = useQuery(
    api.timecards.getStationActivity,
    hasConvex && locationId ? { locationId: locationId as Id<"locations"> } : "skip",
  );

  if (hasConvex) {
    return {
      activity: (convexActivity ?? undefined) as StationActivityData | null | undefined,
      isLoading: convexActivity === undefined,
    };
  }

  return {
    activity: null,
    isLoading: false,
  };
}

export function ActivityPage() {
  const { switcherLocations, locationId, setLocationId, hasConvex, selectedLocation } =
    usePortalLocations();
  const { activity, isLoading } = useStationActivity(locationId, hasConvex);
  const now = useLiveNow(1000);

  const headerActions = (
    <div className="min-w-[220px] max-w-xs">
      <LocationSwitcher
        locations={switcherLocations}
        value={(locationId as LocationId) || switcherLocations[0]?.id}
        onChange={setLocationId}
        label="Activity location"
      />
    </div>
  );

  return (
    <PortalShell
      mode="activity"
      title={`${selectedLocation?.name ?? "Station"} activity`}
      subtitle="Live view of employees currently on the clock and station punch events."
      headerActions={headerActions}
      fullBleed
    >
      <StationActivityBoard activity={activity ?? null} isLoading={isLoading} now={now} />
    </PortalShell>
  );
}

export function StationActivityBoard({
  activity,
  isLoading,
  now,
  selectedEmployeeId,
}: {
  activity: StationActivityData | null;
  isLoading?: boolean;
  now: number;
  selectedEmployeeId?: string;
}) {
  if (isLoading) {
    return (
      <div className="grid min-h-0 flex-1 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Skeleton className="min-h-[420px] rounded-xl opacity-30" />
        <Skeleton className="min-h-[420px] rounded-xl opacity-30" />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="grid min-h-0 flex-1 place-items-center p-6 text-center">
        <div>
          <RadioIcon className="mx-auto size-8 text-muted-foreground" strokeWidth={1.7} />
          <p className="mt-3 text-sm font-semibold">No station data</p>
          <p className="mt-1 text-xs text-muted-foreground">Select an active location to see activity.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <div className="grid shrink-0 grid-cols-2 divide-x divide-border border-b border-border lg:grid-cols-4">
        <ActivityMetric label="On clock" value={activity.quickCounts.onClock} tone="primary" />
        <ActivityMetric label="Working" value={activity.quickCounts.clockedIn} tone="success" />
        <ActivityMetric label="On break" value={activity.quickCounts.onBreak} tone="warning" />
        <ActivityMetric label="Done today" value={activity.quickCounts.clockedOut} tone="neutral" />
      </div>

      <div className="grid min-h-0 gap-0 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-h-0 overflow-y-auto p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold tracking-tight">Employees on the clock</h2>
              <p className="mt-1 text-xs text-muted-foreground">{activity.locationName}</p>
            </div>
            <Badge tone="primary" className="h-6">
              <RadioIcon className="size-3" strokeWidth={2} />
              Live
            </Badge>
          </div>

          {activity.onClock.length > 0 ? (
            <div className="overflow-hidden rounded-xl ring-1 ring-border">
              <div className="divide-y divide-border">
                {activity.onClock.map((employee) => (
                  <ActivityEmployeeRow
                    key={employee.timecardId}
                    employee={employee}
                    now={now}
                    selected={employee.employeeId === selectedEmployeeId}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="grid min-h-72 place-items-center rounded-xl bg-muted/20 p-8 text-center ring-1 ring-border">
              <div>
                <TimerIcon className="mx-auto size-8 text-muted-foreground" strokeWidth={1.7} />
                <p className="mt-3 text-sm font-semibold">Nobody is on the clock</p>
                <p className="mt-1 text-xs text-muted-foreground">Clock-ins will appear here immediately.</p>
              </div>
            </div>
          )}
        </section>

        <section className="min-h-0 border-t border-border bg-muted/20 lg:border-l lg:border-t-0">
          <div className="border-b border-border px-4 py-4 sm:px-5">
            <h2 className="text-sm font-semibold tracking-tight">Station events</h2>
            <p className="mt-1 text-xs text-muted-foreground">Clock-ins, breaks, and clock-outs.</p>
          </div>
          <div className="max-h-full min-h-0 overflow-y-auto px-4 py-3 sm:px-5">
            {activity.recentEvents.length > 0 ? (
              <div className="space-y-1">
                {activity.recentEvents.map((event) => (
                  <ActivityEventRow key={event.eventId} event={event} />
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <p className="text-sm font-semibold">No events yet</p>
                <p className="mt-1 text-xs text-muted-foreground">New punches will show up in this rail.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ActivityMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "primary" | "success" | "warning" | "neutral";
}) {
  return (
    <div className="px-4 py-3 sm:px-5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-2 flex items-end gap-2">
        <span className="text-3xl font-semibold leading-none tabular-nums tracking-tight">{value}</span>
        <Badge tone={tone} className="mb-0.5">
          Today
        </Badge>
      </div>
    </div>
  );
}

function ActivityEmployeeRow({
  employee,
  now,
  selected,
}: {
  employee: StationActivityEmployee;
  now: number;
  selected?: boolean;
}) {
  const status = normalizeStatus(employee.status);
  const clockInAt = getClockInTimestamp(employee, now);
  const elapsed = clockInAt ? formatElapsed(now - clockInAt, employee.totalBreakMinutes) : "Active";

  return (
    <div
      className={[
        "grid gap-3 bg-card px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
        selected ? "bg-primary/10" : "",
      ].join(" ")}
    >
      <div className="flex min-w-0 items-center gap-3">
        <EmployeeAvatar
          name={employee.displayName}
          initials={employee.initials ?? initialsForName(employee.displayName)}
          avatarColor={employee.avatarColor ?? "bg-zinc-600"}
          avatarUrl={employee.avatarUrl}
          employeeId={employee.employeeId}
          size="lg"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{employee.displayName}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {employee.positionName ?? "Employee"}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <Badge tone={status === "on-break" ? "warning" : "success"} className="h-6">
          {status === "on-break" ? <CoffeeIcon className="size-3" /> : <TimerIcon className="size-3" />}
          {statusLabel(status)}
        </Badge>
        <span className="min-w-20 text-right font-mono text-sm font-semibold tabular-nums">
          {elapsed}
        </span>
      </div>
    </div>
  );
}

function ActivityEventRow({ event }: { event: StationActivityEvent }) {
  const Icon = iconForEvent(event.type);

  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-muted/40">
      <EmployeeAvatar
        name={event.displayName}
        initials={event.initials ?? initialsForName(event.displayName)}
        avatarColor={event.avatarColor ?? "bg-zinc-600"}
        avatarUrl={event.avatarUrl}
        employeeId={event.employeeId}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{event.displayName}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <Icon className="size-3" strokeWidth={2} />
          {eventLabel(event.type)}
        </p>
      </div>
      <span className="shrink-0 font-mono text-xs text-muted-foreground">
        {formatEventTime(event)}
      </span>
    </div>
  );
}

export function formatElapsed(elapsedMs: number, breakMinutes = 0) {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / 1000) - breakMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function initialsForName(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function normalizeStatus(status: StationStatus) {
  if (status === "clocked_in") return "clocked-in";
  if (status === "on_break") return "on-break";
  if (status === "clocked_out") return "clocked-out";
  return status;
}

export function statusLabel(status: ReturnType<typeof normalizeStatus>) {
  if (status === "on-break") return "On break";
  if (status === "clocked-in") return "Working";
  return "Clocked out";
}

export function eventLabel(type: StationEventType) {
  if (type === "clock_in" || type === "clock-in") return "Clocked in";
  if (type === "start_break" || type === "start-break") return "Started break";
  if (type === "end_break" || type === "end-break") return "Ended break";
  if (type === "clock_out" || type === "clock-out") return "Clocked out";
  return "Edited timecard";
}

export function iconForEvent(type: StationEventType) {
  if (type === "clock_in" || type === "clock-in") return LogInIcon;
  if (type === "clock_out" || type === "clock-out") return LogOutIcon;
  if (type === "start_break" || type === "start-break" || type === "end_break" || type === "end-break") {
    return CoffeeIcon;
  }
  return UtensilsIcon;
}

export function formatEventTime(event: StationActivityEvent) {
  if (event.occurredAt) {
    return new Date(event.occurredAt).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return event.time ?? "";
}

export function timeStringToTodayTimestamp(time: string | null | undefined, now = Date.now()) {
  if (!time) return undefined;
  const match = time.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/);
  if (!match) return undefined;
  const [, rawHour, rawMinute, period] = match;
  const hourNumber = Number(rawHour);
  const hour = period === "PM" && hourNumber !== 12 ? hourNumber + 12 : period === "AM" && hourNumber === 12 ? 0 : hourNumber;
  const date = new Date(now);
  date.setHours(hour, Number(rawMinute), 0, 0);
  return date.getTime();
}

function getClockInTimestamp(employee: StationActivityEmployee, now: number) {
  return employee.clockInAt ?? timeStringToTodayTimestamp(employee.clockIn, now);
}
