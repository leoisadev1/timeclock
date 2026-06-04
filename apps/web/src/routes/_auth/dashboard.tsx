import { AppShell, type ManagerView } from "@/components/app-shell";
import { EmployeesView } from "@/components/employees-view";
import { ReportsView } from "@/components/reports-view";
import { ScheduleBuilder } from "@/components/schedule-builder";
import { SettingsView } from "@/components/settings-view";
import { TodayDashboard } from "@/components/today-dashboard";
import {
  getLocations,
  getScheduleWeek,
  getTodayDashboard,
  saveScheduleWeek,
} from "@/lib/timeclock-adapter";
import type {
  AttendanceStatus,
  Employee,
  EmployeeId,
  Location,
  LocationId,
  ScheduleWeek,
  Shift,
  TimeEvent,
  Timecard,
  TodayDashboard as TodayDashboardData,
} from "@/lib/timeclock-types";
import { api } from "@timeclock/backend/convex/_generated/api";
import type { Id } from "@timeclock/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useState } from "react";

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

// ---- Type aliases ----------------------------------------------------------------

// Shape returned by api.today.getDashboard
type ConvexDashboardReturn = NonNullable<
  ReturnType<typeof useQuery<typeof api.today.getDashboard>>
>;

// Shape of a single item from api.locations.listForCurrentUser (non-null element).
// Defined inline to avoid complex generic inference over Convex generated types.
type ConvexLocation = {
  id: Id<"locations">;
  name: string;
  address: string;
  timezone: string;
  weekStartDay: number;
  lateGraceMinutes: number;
  noShowThresholdMinutes: number;
  stationUnlockCode: string;
  active: boolean;
  hours: Array<{
    id: Id<"locationHours">;
    dayOfWeek: number;
    opensAtMinutes: number;
    closesAtMinutes: number;
    isClosed: boolean;
  }>;
};

// ---- Mapping helpers -------------------------------------------------------------

// Stable mapping: first Convex location → loc-downtown, second → loc-riverside
const DEMO_IDS: LocationId[] = ["loc-downtown", "loc-riverside"];

function mapConvexLocation(loc: ConvexLocation, index: number): Location {
  return {
    id: DEMO_IDS[index] ?? ("loc-downtown" as LocationId),
    name: loc.name,
    address: loc.address ?? "",
    timezone: loc.timezone,
    weekStart: loc.weekStartDay === 1 ? "Monday" : "Sunday",
    graceMinutes: loc.lateGraceMinutes,
    noShowMinutes: loc.noShowThresholdMinutes,
    operatingHours: Object.fromEntries(
      (loc.hours ?? []).map((h) => [
        ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][h.dayOfWeek] ?? `Day ${h.dayOfWeek}`,
        h.isClosed
          ? "Closed"
          : `${minutesToTime(h.opensAtMinutes)}–${minutesToTime(h.closesAtMinutes)}`,
      ]),
    ),
    active: loc.active,
  };
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

function mapConvexDashboard(
  data: ConvexDashboardReturn,
  location: Location,
): TodayDashboardData {
  // Build a minimal ScheduleWeek so TodayDashboard can render shift summaries.
  // The Convex response only gives us a shift count, not full shift models – we
  // provide an empty shifts array so the component degrades gracefully.
  const schedule: ScheduleWeek = {
    id: data.schedule.scheduleId ?? "convex-schedule",
    locationId: location.id,
    weekStartDate: data.businessDate,
    published: data.schedule.isPublished,
    updatedAt: new Date().toISOString(),
    shifts: [] as Shift[],
  };

  // Map timecards from Convex shape to local Timecard type.
  function mapTimecard(row: (typeof data.clockedIn)[number]): Timecard {
    return {
      id: row.timecardId,
      employeeId: "emp-maya" as EmployeeId,
      locationId: location.id,
      businessDate: row.businessDate,
      status:
        row.status === "clocked_in"
          ? "clocked-in"
          : row.status === "on_break"
            ? "on-break"
            : "clocked-out",
      attendance: (row.attendanceStatus as AttendanceStatus) ?? "on-time",
      clockIn: row.clockInAt ? new Date(row.clockInAt).toLocaleTimeString() : undefined,
      clockOut: row.clockOutAt ? new Date(row.clockOutAt).toLocaleTimeString() : undefined,
      breakMinutes: row.totalBreakMinutes ?? 0,
    };
  }

  // Map scheduled-not-clocked-in rows to Employee stubs.
  const scheduledNotClockedIn: Employee[] = data.scheduledNotClockedIn.map((row) => ({
    id: "emp-maya" as Employee["id"], // placeholder – used only for keying
    name: row.displayName,
    initials: row.displayName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2),
    avatarColor: "bg-slate-500",
    pin: "0000",
    role: (row.role ?? "employee") as Employee["role"],
    position: (row.positionName ?? "Employee") as Employee["position"],
    active: true,
    assignedLocationIds: [location.id],
  }));

  const recentEvents: TimeEvent[] = data.recentPunches.map((punch) => ({
    id: punch.eventId,
    employeeId: "emp-maya" as Employee["id"],
    locationId: location.id,
    businessDate: data.businessDate,
    time: new Date(punch.occurredAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    action: (punch.type === "clock_in"
      ? "clock-in"
      : punch.type === "start_break"
        ? "start-break"
        : punch.type === "end_break"
          ? "end-break"
          : "clock-out") as TimeEvent["action"],
    source: (punch.source ?? "station") as TimeEvent["source"],
  }));

  const noShows: TodayDashboardData["lateOrNoShow"] = data.noShows.map((row) => ({
    employee: {
      id: "emp-maya" as Employee["id"],
      name: row.displayName,
      initials: row.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      avatarColor: "bg-slate-500",
      pin: "0000",
      role: (row.role ?? "employee") as Employee["role"],
      position: (row.positionName ?? "Employee") as Employee["position"],
      active: true,
      assignedLocationIds: [location.id],
    },
    status: "no-show" as AttendanceStatus,
  }));

  const lateEntries: TodayDashboardData["lateOrNoShow"] = data.late.map((row) => ({
    employee: {
      id: "emp-maya" as Employee["id"],
      name: row.displayName,
      initials: row.displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2),
      avatarColor: "bg-slate-500",
      pin: "0000",
      role: (row.role ?? "employee") as Employee["role"],
      position: (row.positionName ?? "Employee") as Employee["position"],
      active: true,
      assignedLocationIds: [location.id],
    },
    status: "late" as AttendanceStatus,
  }));

  return {
    location,
    businessDate: data.businessDate,
    schedule,
    scheduledNotClockedIn,
    clockedIn: data.clockedIn.map(mapTimecard),
    onBreak: data.onBreak.map(mapTimecard),
    clockedOut: data.clockedOut.map(mapTimecard),
    unscheduledClockIns: data.unscheduledClockIns.map(mapTimecard),
    lateOrNoShow: [...lateEntries, ...noShows],
    recentEvents,
  };
}

// ---- Component ------------------------------------------------------------------

function RouteComponent() {
  const todayDateString = new Date().toLocaleDateString("en-CA"); // "YYYY-MM-DD"

  // --- Convex data -----------------------------------------------------------------
  const rawConvexLocations = useQuery(api.locations.listForCurrentUser) ?? [];
  // Filter out null entries that can appear when location records are missing
  const convexLocations = rawConvexLocations.filter(
    (loc): loc is NonNullable<typeof loc> => loc !== null,
  );

  // --- Location resolution ---------------------------------------------------------
  // Prefer Convex locations; fall back to demo adapter if none available.
  const hasConvexLocations = convexLocations.length > 0;

  const locations: Location[] = hasConvexLocations
    ? convexLocations.map((loc, i) => mapConvexLocation(loc, i))
    : getLocations();

  // `locationIndex` tracks which location is selected (index into convexLocations or demo array).
  const [locationIndex, setLocationIndex] = useState(0);
  const [activeView, setActiveView] = useState<ManagerView>("today");

  const safeIndex = Math.min(locationIndex, Math.max(0, locations.length - 1));

  // The LocationId passed to AppShell and demo components is always a demo-style ID.
  const effectiveLocationId: LocationId =
    (DEMO_IDS[safeIndex] ?? "loc-downtown") as LocationId;

  // The real Convex location ID for backend queries.
  const convexLocationId: Id<"locations"> | null = hasConvexLocations
    ? (convexLocations[safeIndex]?.id ?? null)
    : null;

  // The LocationId used by demo-only components (EmployeesView, ReportsView, SettingsView).
  const demoLocationId: LocationId = "loc-downtown" as LocationId;

  // --- Convex dashboard query ------------------------------------------------------
  const convexDashboard = useQuery(
    api.today.getDashboard,
    convexLocationId
      ? { locationId: convexLocationId, businessDate: todayDateString }
      : "skip",
  );

  // --- Schedule state --------------------------------------------------------------
  const [schedule, setSchedule] = useState(() =>
    getScheduleWeek("loc-downtown" as LocationId),
  );

  // --- Resolve dashboard data -------------------------------------------------------
  // Find the raw Convex location for mapping to dashboard data
  const activeConvexLocation = hasConvexLocations ? convexLocations[safeIndex] : undefined;

  const dashboardData: TodayDashboardData = (() => {
    if (convexDashboard && activeConvexLocation) {
      const mappedLocation = mapConvexLocation(activeConvexLocation, safeIndex);
      return mapConvexDashboard(convexDashboard, mappedLocation);
    }
    // Fallback: demo adapter
    return getTodayDashboard(demoLocationId);
  })();

  // --- Render ----------------------------------------------------------------------
  return (
    <AppShell
      activeView={activeView}
      locations={locations}
      locationId={effectiveLocationId}
      onLocationChange={(id) => {
        const idx = locations.findIndex((loc) => loc.id === id);
        setLocationIndex(Math.max(0, idx));
      }}
      onViewChange={setActiveView}
    >
      {activeView === "today" && (
        <TodayDashboard
          data={dashboardData}
          onNavigate={(view) => setActiveView(view)}
        />
      )}
      {activeView === "schedule" && (
        <ScheduleBuilder
          schedule={schedule}
          onScheduleChange={(updated) => {
            setSchedule(saveScheduleWeek(updated));
          }}
        />
      )}
      {activeView === "employees" && <EmployeesView locationId={demoLocationId} />}
      {activeView === "reports" && <ReportsView locationId={demoLocationId} />}
      {activeView === "settings" && <SettingsView locationId={demoLocationId} />}
    </AppShell>
  );
}
