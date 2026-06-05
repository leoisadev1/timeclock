import { AppShell, type ManagerView } from "@/components/app-shell";
import { EmployeesView } from "@/components/employees-view";
import { ReportsView } from "@/components/reports-view";
import { ScheduleBuilder } from "@/components/schedule-builder";
import { SettingsView } from "@/components/settings-view";
import { TodayDashboard } from "@/components/today-dashboard";
import type {
  AttendanceStatus,
  Employee,
  Location,
  LocationId,
  Position,
  ReportRow,
  ScheduleWeek,
  Shift,
  TimeEvent,
  Timecard,
  TodayDashboard as TodayDashboardData,
} from "@/lib/timeclock-types";
import { api } from "@timeclock/backend/convex/_generated/api";
import type { Id } from "@timeclock/backend/convex/_generated/dataModel";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  component: RouteComponent,
});

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SCHEDULE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const POSITIONS: Position[] = ["Manager", "Shift Lead", "Barista", "Cashier", "Cook", "Server"];
const AVATAR_COLORS = [
  "bg-emerald-500",
  "bg-blue-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-amber-500",
];

type ConvexLocation = NonNullable<NonNullable<ReturnType<typeof useQuery<typeof api.locations.listForCurrentUser>>>[number]>;
type ConvexDashboard = NonNullable<ReturnType<typeof useQuery<typeof api.today.getDashboard>>>;
type ConvexWeek = NonNullable<ReturnType<typeof useQuery<typeof api.schedules.getWeek>>>;
type ConvexEmployees = NonNullable<ReturnType<typeof useQuery<typeof api.employees.listByLocation>>>;
type ConvexDailyReport = NonNullable<ReturnType<typeof useQuery<typeof api.reports.dailyTimesheet>>>;
type ConvexWeeklyReport = NonNullable<ReturnType<typeof useQuery<typeof api.reports.weeklySummary>>>;

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "PM" : "AM";
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatTime(timestamp: number, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function getWeekStartDate(date: string, weekStartDay: number): string {
  const dayOfWeek = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  const delta = (dayOfWeek - weekStartDay + 7) % 7;
  return addDays(date, -delta);
}

function dayLabelFromDate(date: string): string {
  return DAY_LABELS[new Date(`${date}T00:00:00.000Z`).getUTCDay()] ?? "Mon";
}

function businessDateForShift(weekStartDate: string, day: string): string {
  const index = SCHEDULE_DAYS.indexOf(day);
  return addDays(weekStartDate, index >= 0 ? index : 0);
}

function parseClockMinutes(value: string): number {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (!match) {
    throw new Error(`Invalid time: ${value}`);
  }
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  const period = match[3].toUpperCase();
  const normalizedHour = period === "AM" ? hour % 12 : (hour % 12) + 12;
  return normalizedHour * 60 + minute;
}

function getZonedParts(timestamp: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(timestamp));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour === "24" ? "0" : map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function timezoneOffsetMs(timestamp: number, timezone: string): number {
  const parts = getZonedParts(timestamp, timezone);
  const localAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return localAsUtc - timestamp;
}

function zonedTimestamp(date: string, minutesAfterMidnight: number, timezone: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const hour = Math.floor(minutesAfterMidnight / 60);
  const minute = minutesAfterMidnight % 60;
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);
  let timestamp = guess - timezoneOffsetMs(guess, timezone);
  timestamp = guess - timezoneOffsetMs(timestamp, timezone);
  return timestamp;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function avatarColor(seed: string): string {
  const total = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return AVATAR_COLORS[total % AVATAR_COLORS.length] ?? "bg-slate-500";
}

function normalizePosition(position: string | null | undefined): Position {
  return POSITIONS.includes(position as Position) ? (position as Position) : "Barista";
}

function normalizeAttendance(status: string | null | undefined): AttendanceStatus {
  if (status === "on_time") return "on-time";
  if (status === "no_show") return "no-show";
  if (status === "early" || status === "late" || status === "unscheduled") return status;
  return "on-time";
}

function mapConvexLocation(loc: ConvexLocation): Location {
  return {
    id: loc.id,
    name: loc.name,
    address: loc.address ?? "",
    timezone: loc.timezone,
    weekStart: loc.weekStartDay === 1 ? "Monday" : "Sunday",
    graceMinutes: loc.lateGraceMinutes,
    noShowMinutes: loc.noShowThresholdMinutes,
    operatingHours: Object.fromEntries(
      (loc.hours ?? []).map((h) => [
        DAY_LABELS[h.dayOfWeek] ?? `Day ${h.dayOfWeek}`,
        h.isClosed
          ? "Closed"
          : `${minutesToTime(h.opensAtMinutes)}-${minutesToTime(h.closesAtMinutes)}`,
      ]),
    ),
    active: loc.active,
  };
}

function mapEmployee(row: ConvexEmployees[number], _locationId: LocationId): Employee {
  return {
    id: row.id,
    name: row.displayName,
    initials: initials(row.displayName),
    avatarColor: avatarColor(row.id),
    pin: row.pin,
    role: row.role,
    position: normalizePosition(row.positionName),
    active: row.active,
    assignedLocationIds: row.assignedLocationIds,
    email: row.email ?? undefined,
  };
}

function warningMap(week: ConvexWeek) {
  const map = new Map<string, Shift["warning"]>();
  for (const warning of week.warnings) {
    const value =
      warning.type === "outside_location_hours"
        ? "outside-hours"
        : warning.type === "high_weekly_hours"
          ? "high-weekly-hours"
          : warning.type === "open_shift"
            ? "open-shift"
            : warning.type === "overlap"
              ? "overlap"
              : undefined;
    if (value) {
      for (const shiftId of warning.shiftIds) {
        map.set(shiftId, value);
      }
    }
  }
  return map;
}

function mapScheduleWeek(week: ConvexWeek, locationId: LocationId): ScheduleWeek {
  const warnings = warningMap(week);
  return {
    id: `${week.locationId}-${week.weekStartDate}`,
    locationId,
    weekStartDate: week.weekStartDate,
    published: week.isPublished,
    publishedAt: week.publishedAt ? new Date(week.publishedAt).toISOString() : undefined,
    updatedAt: week.updatedAt ? new Date(week.updatedAt).toISOString() : new Date().toISOString(),
    shifts: week.shifts.map((shift) => ({
      id: shift.id,
      locationId,
      employeeId: shift.employeeId ?? undefined,
      positionId: shift.positionId,
      day: dayLabelFromDate(shift.startBusinessDate),
      start: formatTime(shift.startAt, week.timezone),
      end: formatTime(shift.endAt, week.timezone),
      position: normalizePosition(shift.positionName),
      breakMinutes: shift.plannedBreakMinutes,
      notes: shift.notes ?? undefined,
      overnight: shift.isOvernight,
      warning: warnings.get(shift.id),
    })),
  };
}

function mapTimecard(row: ConvexDashboard["clockedIn"][number], locationId: LocationId): Timecard {
  return {
    id: row.timecardId,
    employeeId: row.employeeId,
    locationId,
    businessDate: row.businessDate,
    status:
      row.status === "clocked_in"
        ? "clocked-in"
        : row.status === "on_break"
          ? "on-break"
          : "clocked-out",
    attendance: normalizeAttendance(row.attendanceStatus),
    clockIn: row.clockInAt ? formatTime(row.clockInAt, row.timezone) : undefined,
    clockOut: row.clockOutAt ? formatTime(row.clockOutAt, row.timezone) : undefined,
    breakMinutes: row.totalBreakMinutes ?? 0,
  };
}

function employeeFromDashboardRow(
  row: ConvexDashboard["scheduledNotClockedIn"][number],
  locationId: LocationId,
): Employee {
  return {
    id: row.employeeId ?? row.shiftId,
    name: row.displayName,
    initials: initials(row.displayName),
    avatarColor: avatarColor(row.employeeId ?? row.shiftId),
    pin: "0000",
    role: row.role,
    position: normalizePosition(row.positionName),
    active: true,
    assignedLocationIds: [locationId],
  };
}

function mapDashboard(
  data: ConvexDashboard,
  location: Location,
  schedule: ScheduleWeek,
): TodayDashboardData {
  const recentEvents: TimeEvent[] = data.recentPunches.map((event) => ({
    id: event.eventId,
    employeeId: event.employeeId,
    locationId: location.id,
    businessDate: data.businessDate,
    time: formatTime(event.occurredAt, data.timezone),
    action:
      event.type === "clock_in"
        ? "clock-in"
        : event.type === "start_break"
          ? "start-break"
          : event.type === "end_break"
            ? "end-break"
            : "clock-out",
    source: event.source,
  }));

  return {
    location,
    businessDate: data.businessDate,
    schedule,
    scheduledNotClockedIn: data.scheduledNotClockedIn.map((row) =>
      employeeFromDashboardRow(row, location.id),
    ),
    clockedIn: data.clockedIn.map((row) => mapTimecard(row, location.id)),
    onBreak: data.onBreak.map((row) => mapTimecard(row, location.id)),
    clockedOut: data.clockedOut.map((row) => mapTimecard(row, location.id)),
    unscheduledClockIns: data.unscheduledClockIns.map((row) => mapTimecard(row, location.id)),
    lateOrNoShow: [
      ...data.late.map((row) => ({
        employee: {
          id: row.employeeId,
          name: row.displayName,
          initials: initials(row.displayName),
          avatarColor: avatarColor(row.employeeId),
          pin: "0000",
          role: row.role,
          position: normalizePosition(row.positionName),
          active: true,
          assignedLocationIds: [location.id],
        },
        status: "late" as AttendanceStatus,
      })),
      ...data.noShows.map((row) => ({
        employee: employeeFromDashboardRow(row, location.id),
        status: "no-show" as AttendanceStatus,
      })),
    ],
    recentEvents,
  };
}

function reportEmployee(
  id: string,
  name: string,
  role: Employee["role"],
  position: string | null | undefined,
  locationId: LocationId,
): Employee {
  return {
    id,
    name,
    initials: initials(name),
    avatarColor: avatarColor(id),
    pin: "0000",
    role,
    position: normalizePosition(position),
    active: true,
    assignedLocationIds: [locationId],
  };
}

function mapDailyReport(report: ConvexDailyReport, locationId: LocationId): ReportRow[] {
  return report.rows.map((row) => ({
    employee: reportEmployee(row.employeeId, row.displayName, row.role, row.positionName, locationId),
    scheduledHours: row.scheduledHours,
    actualHours: row.actualHours,
    variance: row.varianceHours,
    breakHours: row.breakMinutes / 60,
    edited: row.timecards.some((timecard) => timecard.edited),
    attendance: Array.from(new Set(row.statuses.map(normalizeAttendance))),
  }));
}

function mapWeeklyReport(report: ConvexWeeklyReport, locationId: LocationId): ReportRow[] {
  return report.rows.map((row) => ({
    employee: reportEmployee(row.employeeId, row.displayName, row.role, null, locationId),
    scheduledHours: row.scheduledHours,
    actualHours: row.actualHours,
    variance: row.varianceHours,
    breakHours: row.breakMinutes / 60,
    edited: row.editedTimecards > 0,
    attendance: [
      ...(row.late > 0 ? (["late"] as AttendanceStatus[]) : []),
      ...(row.early > 0 ? (["early"] as AttendanceStatus[]) : []),
      ...(row.unscheduled > 0 ? (["unscheduled"] as AttendanceStatus[]) : []),
    ],
  }));
}

function positionOptions(week: ConvexWeek | undefined, employees: ConvexEmployees): Array<{ id: string; name: Position }> {
  const byName = new Map<Position, string>();
  for (const employee of employees) {
    if (employee.positionId && employee.positionName) {
      byName.set(normalizePosition(employee.positionName), employee.positionId);
    }
  }
  for (const shift of week?.shifts ?? []) {
    byName.set(normalizePosition(shift.positionName), shift.positionId);
  }
  for (const coverage of week?.coverageSummary ?? []) {
    byName.set(normalizePosition(coverage.positionName), coverage.positionId);
  }
  return Array.from(byName.entries()).map(([name, id]) => ({ id, name }));
}

function shiftPayload(
  shift: Shift,
  schedule: ScheduleWeek,
  timezone: string,
  positions: Array<{ id: string; name: Position }>,
  existingShiftIds: Set<string>,
) {
  const positionId = shift.positionId ?? positions.find((position) => position.name === shift.position)?.id;
  if (!positionId) {
    throw new Error("Pick a position that exists in this location before saving the shift.");
  }
  const businessDate = businessDateForShift(schedule.weekStartDate, shift.day);
  const startMinutes = parseClockMinutes(shift.start);
  const endMinutes = parseClockMinutes(shift.end);
  const endDate = shift.overnight || endMinutes <= startMinutes ? addDays(businessDate, 1) : businessDate;
  return {
    weekStartDate: schedule.weekStartDate,
    shiftId: existingShiftIds.has(shift.id) ? (shift.id as Id<"shifts">) : undefined,
    employeeId: shift.employeeId ? (shift.employeeId as Id<"employees">) : null,
    positionId: positionId as Id<"positions">,
    startAt: zonedTimestamp(businessDate, startMinutes, timezone),
    endAt: zonedTimestamp(endDate, endMinutes, timezone),
    plannedBreakMinutes: shift.breakMinutes,
    notes: shift.notes ?? "",
  };
}

function RouteComponent() {
  const todayDateString = new Date().toLocaleDateString("en-CA");
  const rawConvexLocations = useQuery(api.locations.listForCurrentUser);
  const convexLocations = (rawConvexLocations ?? []).filter(
    (loc): loc is NonNullable<typeof loc> => loc !== null,
  );
  const isLoadingLocations = rawConvexLocations === undefined;
  const hasConvexLocations = convexLocations.length > 0;

  const locations: Location[] = convexLocations.map(mapConvexLocation);

  const [locationIndex, setLocationIndex] = useState(0);
  const [activeView, setActiveView] = useState<ManagerView>("today");

  const safeIndex = Math.min(locationIndex, Math.max(0, locations.length - 1));
  const activeLocation = locations[safeIndex];
  const effectiveLocationId = activeLocation?.id ?? "";
  const activeConvexLocation = hasConvexLocations ? convexLocations[safeIndex] : undefined;
  const convexLocationId = activeConvexLocation?.id ?? null;
  const weekStartDate = getWeekStartDate(todayDateString, activeLocation?.weekStart === "Sunday" ? 0 : 1);
  const nextWeekStartDate = addDays(weekStartDate, 7);

  const convexDashboard = useQuery(
    api.today.getDashboard,
    convexLocationId ? { locationId: convexLocationId, businessDate: todayDateString } : "skip",
  );
  const currentWeek = useQuery(
    api.schedules.getWeek,
    convexLocationId ? { locationId: convexLocationId, weekStartDate } : "skip",
  );
  const nextWeek = useQuery(
    api.schedules.getWeek,
    convexLocationId ? { locationId: convexLocationId, weekStartDate: nextWeekStartDate } : "skip",
  );
  const convexEmployees = useQuery(
    api.employees.listByLocation,
    convexLocationId ? { locationId: convexLocationId } : "skip",
  );
  const dailyReport = useQuery(
    api.reports.dailyTimesheet,
    convexLocationId ? { locationId: convexLocationId, businessDate: todayDateString } : "skip",
  );
  const weeklyReport = useQuery(
    api.reports.weeklySummary,
    convexLocationId ? { locationId: convexLocationId, weekStartDate } : "skip",
  );
  const locationSettings = useQuery(
    api.locations.getSettings,
    convexLocationId ? { locationId: convexLocationId } : "skip",
  );

  const upsertShift = useMutation(api.schedules.upsertShift);
  const deleteShiftMutation = useMutation(api.schedules.deleteShift);
  const duplicateShiftMutation = useMutation(api.schedules.duplicateShift);
  const publishWeek = useMutation(api.schedules.publishWeek);
  const deactivateEmployee = useMutation(api.employees.deactivate);
  const updateSettings = useMutation(api.locations.updateSettings);

  const employees = useMemo(
    () =>
      convexEmployees && convexLocationId
        ? convexEmployees.map((employee) => mapEmployee(employee, convexLocationId))
        : undefined,
    [convexEmployees, convexLocationId],
  );
  const currentSchedule = currentWeek
    ? mapScheduleWeek(currentWeek, effectiveLocationId)
    : undefined;
  const schedule = nextWeek
    ? mapScheduleWeek(nextWeek, effectiveLocationId)
    : undefined;
  const positions = positionOptions(nextWeek ?? currentWeek, convexEmployees ?? []);
  const existingShiftIds = useMemo(
    () => new Set((nextWeek?.shifts ?? []).map((shift) => shift.id)),
    [nextWeek],
  );

  const dashboardData: TodayDashboardData | undefined =
    convexDashboard && currentWeek && activeLocation && currentSchedule
      ? mapDashboard(convexDashboard, activeLocation, currentSchedule)
      : undefined;

  if (isLoadingLocations) {
    return <DashboardState title="Loading live data" detail="Connecting to the cloud Convex deployment." />;
  }

  if (!activeLocation || !convexLocationId) {
    return (
      <DashboardState
        title="No live manager data"
        detail="This dashboard only shows cloud data. Log in with a seeded manager or admin account, then refresh."
      />
    );
  }

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
        dashboardData ? (
          <TodayDashboard
            data={dashboardData}
            employees={employees ?? []}
            onNavigate={(view) => setActiveView(view)}
          />
        ) : (
          <DashboardState title="Loading today" detail="Fetching live schedule and attendance data." />
        )
      )}
      {activeView === "schedule" && (
        schedule && nextWeek ? (
          <ScheduleBuilder
            schedule={schedule}
            employees={employees ?? []}
            positions={positions}
            onScheduleChange={() => {}}
            onSaveShift={async (shift) => {
              try {
                await upsertShift({
                  locationId: convexLocationId,
                  ...shiftPayload(
                    shift,
                    schedule,
                    nextWeek.timezone,
                    positions,
                    existingShiftIds,
                  ),
                });
                toast.success(existingShiftIds.has(shift.id as Id<"shifts">) ? "Shift updated" : "Shift created");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Shift save failed");
                throw error;
              }
            }}
            onDuplicateShift={async (shift) => {
              await duplicateShiftMutation({ shiftId: shift.id as Id<"shifts"> });
              toast.success("Shift duplicated");
            }}
            onDeleteShift={async (shiftId) => {
              await deleteShiftMutation({ shiftId: shiftId as Id<"shifts"> });
              toast.success("Shift deleted");
            }}
            onPublishSchedule={async () => {
              await publishWeek({ locationId: convexLocationId, weekStartDate: schedule.weekStartDate });
              toast.success("Schedule published");
            }}
          />
        ) : (
          <DashboardState title="Loading schedule" detail="Fetching the live schedule from Convex." />
        )
      )}
      {activeView === "employees" && (
        <EmployeesView
          locationId={effectiveLocationId}
          employees={employees ?? []}
          onDeactivate={async (employeeId) => {
            await deactivateEmployee({
              locationId: convexLocationId,
              employeeId: employeeId as Id<"employees">,
            });
            toast.success("Employee deactivated");
          }}
        />
      )}
      {activeView === "reports" && (
        <ReportsView
          locationId={effectiveLocationId}
          dailyRows={dailyReport ? mapDailyReport(dailyReport, effectiveLocationId) : []}
          weeklyRows={weeklyReport ? mapWeeklyReport(weeklyReport, effectiveLocationId) : []}
        />
      )}
      {activeView === "settings" && (
        <SettingsView
          locationId={effectiveLocationId}
          location={locationSettings ? mapConvexLocation(locationSettings) : activeLocation}
          onSave={async (settings) => {
            await updateSettings({ locationId: convexLocationId, ...settings });
            toast.success("Settings saved");
          }}
        />
      )}
    </AppShell>
  );
}

function DashboardState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md border p-6">
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}
