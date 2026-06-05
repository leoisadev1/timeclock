import { AppShell, type ManagerView } from "@/components/app-shell";
import { AlertsCornerIndicator } from "@/components/alerts-corner-indicator";
import { employeeAvatarUrl } from "@/components/employee-avatar";
import { EmployeesView } from "@/components/employees-view";
import { ReportsView } from "@/components/reports-view";
import { ScheduleBuilder } from "@/components/schedule-builder";
import { SettingsView } from "@/components/settings-view";
import type {
  Employee,
  Location,
  LocationId,
  Position,
  ScheduleWeek,
  Shift,
} from "@/lib/timeclock-types";
import { useAuth } from "@clerk/tanstack-react-start";
import { api } from "@timeclock/backend/convex/_generated/api";
import type { Id } from "@timeclock/backend/convex/_generated/dataModel";
import { dashboardSearchParams, defaultManagerView } from "@/lib/dashboard-search";
import { Button } from "@timeclock/ui/components/button";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { createStandardSchemaV1, useQueryStates } from "nuqs";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  validateSearch: createStandardSchemaV1(dashboardSearchParams, { partialOutput: true }),
  beforeLoad: ({ context }) => {
    if (!context.userId) {
      throw redirect({
        to: "/auth",
        search: { reason: "dashboard", redirect: "/dashboard" },
      });
    }
  },
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

type ConvexLocation = NonNullable<
  NonNullable<ReturnType<typeof useQuery<typeof api.locations.listForCurrentUser>>>[number]
>;
type ConvexWeek = NonNullable<ReturnType<typeof useQuery<typeof api.schedules.getWeek>>>;
type ConvexEmployees = NonNullable<
  ReturnType<typeof useQuery<typeof api.employees.listByLocation>>
>;

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
    firstName: row.firstName,
    lastName: row.lastName,
    initials: initials(row.displayName),
    avatarColor: avatarColor(row.id),
    avatarUrl: employeeAvatarUrl(row.id, row.displayName, row.avatarUrl),
    pin: row.pin,
    role: row.role,
    position: normalizePosition(row.positionName),
    positionId: row.positionId ?? undefined,
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

function shiftPayload(
  shift: Shift,
  schedule: ScheduleWeek,
  timezone: string,
  positions: Array<{ id: string; name: Position }>,
  existingShiftIds: Set<string>,
) {
  const positionId =
    shift.positionId ?? positions.find((position) => position.name === shift.position)?.id;
  if (!positionId) {
    throw new Error("Pick a position that exists in this location before saving the shift.");
  }
  const businessDate = businessDateForShift(schedule.weekStartDate, shift.day);
  const startMinutes = parseClockMinutes(shift.start);
  const endMinutes = parseClockMinutes(shift.end);
  const endDate =
    shift.overnight || endMinutes <= startMinutes ? addDays(businessDate, 1) : businessDate;
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
  const [dashboardSearch, setDashboardSearch] = useQueryStates(dashboardSearchParams, {
    history: "replace",
    shallow: true,
  });
  const updateSearch = setDashboardSearch;
  const auth = useAuth();
  const todayDateString = new Date().toLocaleDateString("en-CA");
  const isSignedIn = auth.isSignedIn === true;
  const canLoadManagerData = auth.isLoaded && isSignedIn;
  const rawConvexLocations = useQuery(
    api.locations.listForCurrentUser,
    canLoadManagerData ? {} : "skip",
  );
  const demoStatus = useQuery(api.demo.getStatus, canLoadManagerData ? {} : "skip");
  const workspaceStatus = useQuery(
    api.demo.getManagerWorkspaceStatus,
    canLoadManagerData ? {} : "skip",
  );
  const convexLocations = (rawConvexLocations ?? []).filter(
    (loc): loc is NonNullable<typeof loc> => loc !== null,
  );
  const hasConvexLocations = convexLocations.length > 0;
  const locationsLoading = canLoadManagerData && rawConvexLocations === undefined;
  const workspaceMetaLoading =
    canLoadManagerData && (demoStatus === undefined || workspaceStatus === undefined);

  const locations: Location[] = convexLocations.map(mapConvexLocation);

  const activeView: ManagerView = dashboardSearch.view ?? defaultManagerView();
  const locationIndex = useMemo(() => {
    if (dashboardSearch.location) {
      const idx = locations.findIndex((loc) => loc.id === dashboardSearch.location);
      if (idx >= 0) {
        return idx;
      }
    }
    return 0;
  }, [dashboardSearch.location, locations]);
  const viewingWeekStart = dashboardSearch.week ?? null;
  const scheduleWeekCacheRef = useRef<ScheduleWeek | null>(null);

  const safeIndex = Math.min(locationIndex, Math.max(0, locations.length - 1));
  const activeLocation = locations[safeIndex];
  const effectiveLocationId = activeLocation?.id ?? "";
  const activeConvexLocation = hasConvexLocations ? convexLocations[safeIndex] : undefined;
  const convexLocationId = activeConvexLocation?.id ?? null;

  useEffect(() => {
    scheduleWeekCacheRef.current = null;
  }, [convexLocationId]);

  const weekStartDate = getWeekStartDate(
    todayDateString,
    activeLocation?.weekStart === "Sunday" ? 0 : 1,
  );
  const nextWeekStartDate = addDays(weekStartDate, 7);
  const effectiveViewingWeek = viewingWeekStart ?? nextWeekStartDate;

  const viewingWeek = useQuery(
    api.schedules.getWeek,
    convexLocationId
      ? { locationId: convexLocationId, weekStartDate: effectiveViewingWeek }
      : "skip",
  );
  useQuery(
    api.schedules.getWeek,
    convexLocationId
      ? { locationId: convexLocationId, weekStartDate: addDays(effectiveViewingWeek, -7) }
      : "skip",
  );
  useQuery(
    api.schedules.getWeek,
    convexLocationId
      ? { locationId: convexLocationId, weekStartDate: addDays(effectiveViewingWeek, 7) }
      : "skip",
  );
  const convexEmployees = useQuery(
    api.employees.listByLocation,
    convexLocationId ? { locationId: convexLocationId } : "skip",
  );
  const convexPositions = useQuery(
    api.positions.listByLocation,
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
  const updateEmployee = useMutation(api.employees.update);
  const createEmployee = useMutation(api.employees.create);
  const createPosition = useMutation(api.positions.create);
  const updatePosition = useMutation(api.positions.update);
  const deactivatePosition = useMutation(api.positions.deactivate);
  const updateSettings = useMutation(api.locations.updateSettings);
  const resetAndSeedForCurrentUser = useMutation(api.demo.resetAndSeedForCurrentUser);
  const ensureManagerAccess = useMutation(api.demo.ensureManagerAccess);
  const createLocationMutation = useMutation(api.locations.create);
  const [createLocationPending, setCreateLocationPending] = useState(false);
  const [seedResetPending, setSeedResetPending] = useState(false);
  const [linkPending, setLinkPending] = useState(false);
  const [autoLinkAttempted, setAutoLinkAttempted] = useState(false);

  useEffect(() => {
    if (
      !canLoadManagerData ||
      locationsLoading ||
      workspaceMetaLoading ||
      hasConvexLocations ||
      autoLinkAttempted ||
      linkPending ||
      seedResetPending
    ) {
      return;
    }
    if (demoStatus?.seeded !== true) {
      return;
    }

    setAutoLinkAttempted(true);
    void ensureManagerAccess({})
      .then((result) => {
        if (result.linked && !result.alreadyLinked) {
          toast.success(`${result.manager?.name ?? "Manager"} connected to this account`);
        }
      })
      .catch(() => {
        // User can connect manually from the setup card.
      });
  }, [
    autoLinkAttempted,
    canLoadManagerData,
    demoStatus?.seeded,
    ensureManagerAccess,
    hasConvexLocations,
    linkPending,
    locationsLoading,
    seedResetPending,
    workspaceMetaLoading,
  ]);

  async function connectManagerAccess() {
    setLinkPending(true);
    try {
      const result = await ensureManagerAccess({});
      if (!result.linked || !result.manager) {
        toast.error("Could not connect manager access for this account.");
        return;
      }
      toast.success(
        result.alreadyLinked
          ? `${result.manager.name} is already connected`
          : `${result.manager.name} connected to this account`,
      );
      updateSearch({ location: undefined, week: undefined });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not connect manager access");
    } finally {
      setLinkPending(false);
    }
  }

  const employees = useMemo(
    () =>
      convexEmployees && convexLocationId
        ? convexEmployees.map((employee) => mapEmployee(employee, convexLocationId))
        : undefined,
    [convexEmployees, convexLocationId],
  );
  const mappedViewingWeek = viewingWeek ? mapScheduleWeek(viewingWeek, effectiveLocationId) : null;
  const viewingWeekMatches =
    mappedViewingWeek?.weekStartDate === effectiveViewingWeek &&
    viewingWeek?.weekStartDate === effectiveViewingWeek;
  if (viewingWeekMatches && mappedViewingWeek) {
    scheduleWeekCacheRef.current = mappedViewingWeek;
  }
  const scheduleWeekLoading = Boolean(
    convexLocationId && activeView === "schedule" && (!viewingWeek || !viewingWeekMatches),
  );
  const schedule =
    viewingWeekMatches && mappedViewingWeek
      ? mappedViewingWeek
      : scheduleWeekCacheRef.current?.weekStartDate === effectiveViewingWeek
        ? scheduleWeekCacheRef.current
        : mappedViewingWeek && scheduleWeekLoading
          ? {
              ...mappedViewingWeek,
              id: `${effectiveLocationId}-${effectiveViewingWeek}`,
              weekStartDate: effectiveViewingWeek,
              shifts: [],
            }
          : (scheduleWeekCacheRef.current ?? mappedViewingWeek ?? undefined);
  const locationPositions = useMemo(() => convexPositions ?? [], [convexPositions]);
  const positions = useMemo(
    () =>
      locationPositions.map((position) => ({
        id: position.id,
        name: normalizePosition(position.name),
      })),
    [locationPositions],
  );
  const existingShiftIds = useMemo(
    () => new Set((viewingWeekMatches ? (viewingWeek?.shifts ?? []) : []).map((shift) => shift.id)),
    [viewingWeek, viewingWeekMatches],
  );

  const alertCount = useMemo(() => {
    if (viewingWeekMatches && viewingWeek?.warnings?.length) {
      return viewingWeek.warnings.length;
    }
    const shifts =
      (viewingWeekMatches && mappedViewingWeek ? mappedViewingWeek : schedule)?.shifts ?? [];
    return shifts.filter((shift) => shift.warning && shift.warning !== "open-shift").length;
  }, [mappedViewingWeek, schedule, viewingWeek, viewingWeekMatches]);

  const alertLabel =
    alertCount > 0
      ? `${alertCount} schedule ${alertCount === 1 ? "warning" : "warnings"}`
      : undefined;

  if (!auth.isLoaded) {
    return <DashboardBlank />;
  }

  if (
    locationsLoading ||
    workspaceMetaLoading ||
    (demoStatus?.seeded && linkPending && !hasConvexLocations)
  ) {
    return (
      <>
        <DashboardBlank />
        <AlertsCornerIndicator count={alertCount} label={alertLabel} />
      </>
    );
  }

  if (!activeLocation || !convexLocationId) {
    const isSeeded = demoStatus?.seeded === true;
    const isLinked = workspaceStatus?.linked === true;
    const linkedWithoutLocations = isLinked && (workspaceStatus?.locationCount ?? 0) === 0;

    return (
      <DashboardState
        title={
          linkedWithoutLocations
            ? "No locations assigned"
            : isSeeded
              ? "Connect manager access"
              : "Set up your manager workspace"
        }
        detail={
          linkedWithoutLocations
            ? `${workspaceStatus?.managerName ?? "This manager"} has no active locations. Ask an admin to assign one, or reset demo data.`
            : isSeeded
              ? "Demo data is already in Convex. Link this Clerk account to a manager profile — you do not need to wipe the database again."
              : "Seed demo locations and employees, then link them to your signed-in Clerk user."
        }
        action={
          <div className="flex flex-col gap-2">
            {isSeeded && !linkedWithoutLocations ? (
              <Button disabled={linkPending || seedResetPending} onClick={connectManagerAccess}>
                {linkPending ? "Connecting..." : "Connect my account"}
              </Button>
            ) : null}
            <Button
              variant={isSeeded ? "outline" : "default"}
              disabled={seedResetPending || linkPending}
              onClick={async () => {
                setSeedResetPending(true);
                try {
                  const seeded = await resetAndSeedForCurrentUser({});
                  toast.success(`${seeded.linkedManager.name} is linked to this Clerk user`);
                  updateSearch({ location: undefined, week: undefined });
                } catch (error) {
                  toast.error(
                    error instanceof Error ? error.message : "Could not seed manager access",
                  );
                } finally {
                  setSeedResetPending(false);
                }
              }}
            >
              {seedResetPending
                ? "Resetting..."
                : isSeeded
                  ? "Reset demo data"
                  : "Seed for my user"}
            </Button>
          </div>
        }
      />
    );
  }

  return (
    <AppShell
      activeView={activeView}
      locations={locations}
      locationId={effectiveLocationId}
      alertCount={alertCount}
      alertLabel={alertLabel}
      onLocationChange={(id) => {
        updateSearch({ location: id, week: undefined });
      }}
      onViewChange={(view) => updateSearch({ view })}
      createLocationPending={createLocationPending}
      onCreateLocation={
        hasConvexLocations
          ? async (input) => {
              setCreateLocationPending(true);
              try {
                const created = await createLocationMutation(input);
                if (!created) {
                  throw new Error("Location was not created.");
                }
                toast.success(`${created.name} is ready`);
                updateSearch({ location: created.id, week: undefined });
                return created.id as LocationId;
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not create location");
                throw error;
              } finally {
                setCreateLocationPending(false);
              }
            }
          : undefined
      }
    >
      {activeView === "schedule" &&
        (schedule && viewingWeek ? (
          <ScheduleBuilder
            schedule={schedule}
            employees={employees ?? []}
            positions={positions}
            onScheduleChange={() => {}}
            onWeekChange={(weekStart) => updateSearch({ week: weekStart })}
            onSaveShift={async (shift) => {
              try {
                await upsertShift({
                  locationId: convexLocationId,
                  ...shiftPayload(
                    shift,
                    schedule,
                    viewingWeek.timezone,
                    positions,
                    existingShiftIds,
                  ),
                });
                toast.success(
                  existingShiftIds.has(shift.id as Id<"shifts">)
                    ? "Shift updated"
                    : "Shift created",
                );
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
              await publishWeek({
                locationId: convexLocationId,
                weekStartDate: schedule.weekStartDate,
              });
              toast.success("Schedule published");
            }}
          />
        ) : (
          <ViewBlank />
        ))}
      {activeView === "employees" && (
        <EmployeesView
          locationId={effectiveLocationId}
          employees={employees ?? []}
          positions={locationPositions}
          onOpenSettings={() => updateSearch({ view: "settings" })}
          onSaveEmployee={async (employeeId, values) => {
            await updateEmployee({
              employeeId: employeeId as Id<"employees">,
              locationId: convexLocationId,
              firstName: values.firstName,
              lastName: values.lastName,
              email: values.email || undefined,
              pin: values.pin,
              role: values.role,
              defaultPositionId: values.positionId as Id<"positions">,
            });
            toast.success("Employee updated");
          }}
          onCreateEmployee={async (values) => {
            await createEmployee({
              locationId: convexLocationId,
              firstName: values.firstName,
              lastName: values.lastName,
              email: values.email || undefined,
              pin: values.pin,
              role: values.role,
              defaultPositionId: values.positionId as Id<"positions">,
            });
            toast.success("Employee created");
          }}
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
          dailyReport={dailyReport ?? null}
          weeklyReport={weeklyReport ?? null}
        />
      )}
      {activeView === "settings" && (
        <SettingsView
          locationId={effectiveLocationId}
          location={locationSettings ? mapConvexLocation(locationSettings) : activeLocation}
          positions={locationPositions}
          onSave={async (settings) => {
            await updateSettings({ locationId: convexLocationId, ...settings });
            toast.success("Settings saved");
          }}
          onCreatePosition={async (input) => {
            await createPosition({ locationId: convexLocationId, ...input });
            toast.success(`Added ${input.name}`);
          }}
          onUpdatePosition={async (positionId, input) => {
            await updatePosition({
              locationId: convexLocationId,
              positionId: positionId as Id<"positions">,
              ...input,
            });
            toast.success("Position updated");
          }}
          onRemovePosition={async (positionId) => {
            await deactivatePosition({
              locationId: convexLocationId,
              positionId: positionId as Id<"positions">,
            });
            toast.success("Position removed");
          }}
        />
      )}
    </AppShell>
  );
}

function DashboardBlank() {
  return <div className="min-h-svh bg-background" aria-busy="true" aria-label="Loading" />;
}

function ViewBlank() {
  return <div className="min-h-full bg-background" aria-busy="true" aria-label="Loading" />;
}

function DashboardState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-6 text-foreground">
      <div className="w-full max-w-md border p-6">
        <h1 className="text-base font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </div>
    </div>
  );
}
