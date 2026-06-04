import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  addDays,
  dayOfWeekFromIsoDate,
  employeeName,
  formatIsoDateInTimezone,
  getEmployeeMap,
  getLocationHours,
  getPositionMap,
  getWeekStartDate,
  hoursBetween,
  isEmployeeAssignedToLocation,
  minutesSinceMidnight,
  requireLocationManager,
  type ReaderCtx,
  roundHours,
} from "./shared";

type ShiftModel = {
  id: Id<"shifts">;
  scheduleId: Id<"schedules">;
  employeeId: Id<"employees"> | null;
  employeeName: string;
  avatarUrl: string | null;
  positionId: Id<"positions">;
  positionName: string;
  positionColor: string;
  locationId: Id<"locations">;
  startAt: number;
  endAt: number;
  startBusinessDate: string;
  plannedBreakMinutes: number;
  notes: string | null;
  hours: number;
  isOpen: boolean;
  isOvernight: boolean;
};

async function getOrCreateSchedule(
  ctx: MutationCtx,
  location: Doc<"locations">,
  weekStartDate: string,
): Promise<Doc<"schedules">> {
  const existing = await ctx.db
    .query("schedules")
    .withIndex("by_locationId_and_weekStartDate", (q) =>
      q.eq("locationId", location._id).eq("weekStartDate", weekStartDate),
    )
    .unique();
  if (existing) {
    return existing;
  }
  const timestamp = Date.now();
  const scheduleId = await ctx.db.insert("schedules", {
    companyId: location.companyId,
    locationId: location._id,
    weekStartDate,
    isPublished: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
  return (await ctx.db.get(scheduleId))!;
}

async function buildShiftModels(
  ctx: ReaderCtx,
  location: Doc<"locations">,
  shifts: Doc<"shifts">[],
): Promise<ShiftModel[]> {
  const positions = await getPositionMap(ctx, location._id);
  const employees = await getEmployeeMap(ctx, location.companyId);
  return shifts.map((shift) => {
    const employee = shift.employeeId ? employees.get(shift.employeeId) : undefined;
    const position = positions.get(shift.positionId);
    const endBusinessDate = formatIsoDateInTimezone(shift.endAt, location.timezone);
    return {
      id: shift._id,
      scheduleId: shift.scheduleId,
      employeeId: shift.employeeId ?? null,
      employeeName: employeeName(employee),
      avatarUrl: employee?.avatarUrl ?? null,
      positionId: shift.positionId,
      positionName: position?.name ?? "Unknown",
      positionColor: position?.color ?? "#64748b",
      locationId: shift.locationId,
      startAt: shift.startAt,
      endAt: shift.endAt,
      startBusinessDate: shift.startBusinessDate,
      plannedBreakMinutes: shift.plannedBreakMinutes,
      notes: shift.notes ?? null,
      hours: roundHours(hoursBetween(shift.startAt, shift.endAt, shift.plannedBreakMinutes)),
      isOpen: !shift.employeeId,
      isOvernight: endBusinessDate !== shift.startBusinessDate,
    };
  });
}

function makeWarnings(
  location: Doc<"locations">,
  hours: Doc<"locationHours">[],
  shifts: ShiftModel[],
) {
  const warnings: Array<{
    id: string;
    type: string;
    severity: "info" | "warning";
    message: string;
    shiftIds: Id<"shifts">[];
  }> = [];
  const hoursByDay = new Map(hours.map((row) => [row.dayOfWeek, row]));
  for (const shift of shifts) {
    const dayHours = hoursByDay.get(dayOfWeekFromIsoDate(shift.startBusinessDate));
    const startMinutes = minutesSinceMidnight(shift.startAt, location.timezone);
    const endMinutes = minutesSinceMidnight(shift.endAt, location.timezone);
    if (
      dayHours &&
      (dayHours.isClosed ||
        startMinutes < dayHours.opensAtMinutes ||
        (!shift.isOvernight && endMinutes > dayHours.closesAtMinutes))
    ) {
      warnings.push({
        id: `outside-hours-${shift.id}`,
        type: "outside_location_hours",
        severity: "warning",
        message: `${shift.employeeName} is scheduled outside ${location.name} operating hours.`,
        shiftIds: [shift.id],
      });
    }
    if (shift.isOpen) {
      warnings.push({
        id: `open-shift-${shift.id}`,
        type: "open_shift",
        severity: "info",
        message: `${shift.positionName} shift is still open.`,
        shiftIds: [shift.id],
      });
    }
  }

  const assignedShifts = shifts.filter((shift) => shift.employeeId !== null);
  for (const shift of assignedShifts) {
    const overlaps = assignedShifts.filter(
      (candidate) =>
        candidate.id !== shift.id &&
        candidate.employeeId === shift.employeeId &&
        candidate.startAt < shift.endAt &&
        candidate.endAt > shift.startAt,
    );
    if (overlaps.length > 0) {
      warnings.push({
        id: `overlap-${shift.id}`,
        type: "overlap",
        severity: "warning",
        message: `${shift.employeeName} has overlapping shifts.`,
        shiftIds: [shift.id, ...overlaps.map((overlap) => overlap.id)],
      });
    }
  }

  const weeklyHours = new Map<Id<"employees">, number>();
  for (const shift of assignedShifts) {
    weeklyHours.set(shift.employeeId!, (weeklyHours.get(shift.employeeId!) ?? 0) + shift.hours);
  }
  for (const [employeeId, hoursValue] of weeklyHours) {
    if (hoursValue > 40) {
      const employeeShift = assignedShifts.find((shift) => shift.employeeId === employeeId);
      warnings.push({
        id: `high-hours-${employeeId}`,
        type: "high_weekly_hours",
        severity: "warning",
        message: `${employeeShift?.employeeName ?? "Employee"} is scheduled for ${roundHours(hoursValue)} hours.`,
        shiftIds: assignedShifts
          .filter((shift) => shift.employeeId === employeeId)
          .map((shift) => shift.id),
      });
    }
  }
  return warnings;
}

async function buildWeek(
  ctx: ReaderCtx,
  locationId: Id<"locations">,
  weekStartDate: string,
  employeeVisibleOnly: boolean,
) {
  const location = await ctx.db.get(locationId);
  if (!location) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Location not found." });
  }
  const schedule = await ctx.db
    .query("schedules")
    .withIndex("by_locationId_and_weekStartDate", (q) =>
      q.eq("locationId", locationId).eq("weekStartDate", weekStartDate),
    )
    .unique();
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStartDate, index);
    return {
      date,
      dayOfWeek: dayOfWeekFromIsoDate(date),
      label: new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(`${date}T00:00:00Z`)),
    };
  });
  const empty = {
    locationId,
    locationName: location.name,
    timezone: location.timezone,
    weekStartDate,
    days,
    employeeRows: [],
    openShiftRow: { employeeId: null, displayName: "Open Shifts", shifts: [], weeklyTotalHours: 0 },
    shifts: [],
    dailyTotals: days.map((day) => ({ date: day.date, hours: 0 })),
    weeklyTotalHours: 0,
    coverageSummary: [],
    warnings: [],
    isPublished: false,
    publishedAt: null,
    updatedAt: null,
  };
  if (!schedule || (employeeVisibleOnly && !schedule.isPublished)) {
    return empty;
  }

  const rawShifts = await ctx.db
    .query("shifts")
    .withIndex("by_scheduleId", (q) => q.eq("scheduleId", schedule._id))
    .take(300);
  const shifts = await buildShiftModels(ctx, location, rawShifts);
  const assignments = await ctx.db
    .query("employeeLocations")
    .withIndex("by_locationId", (q) => q.eq("locationId", locationId))
    .take(200);
  const employees = await getEmployeeMap(ctx, location.companyId);
  const positions = await getPositionMap(ctx, location._id);
  const employeeRows = assignments
    .map((assignment) => employees.get(assignment.employeeId))
    .filter((employee): employee is Doc<"employees"> => Boolean(employee?.active))
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map((employee) => {
      const employeeShifts = shifts.filter((shift) => shift.employeeId === employee._id);
      const defaultPosition = employee.defaultPositionId ? positions.get(employee.defaultPositionId) : undefined;
      return {
        employeeId: employee._id,
        displayName: employee.displayName,
        avatarUrl: employee.avatarUrl,
        role: employee.role,
        positionName: defaultPosition?.name ?? null,
        shifts: employeeShifts,
        weeklyTotalHours: roundHours(employeeShifts.reduce((total, shift) => total + shift.hours, 0)),
      };
    });
  const openShifts = shifts.filter((shift) => shift.isOpen);
  const dailyTotals = days.map((day) => ({
    date: day.date,
    hours: roundHours(
      shifts
        .filter((shift) => shift.startBusinessDate === day.date)
        .reduce((total, shift) => total + shift.hours, 0),
    ),
  }));
  const coverageSummary = days.flatMap((day) => {
    const byPosition = new Map<string, { positionId: Id<"positions">; positionName: string; hours: number; count: number }>();
    for (const shift of shifts.filter((candidate) => candidate.startBusinessDate === day.date)) {
      const existing = byPosition.get(shift.positionName) ?? {
        positionId: shift.positionId,
        positionName: shift.positionName,
        hours: 0,
        count: 0,
      };
      existing.hours += shift.hours;
      existing.count += 1;
      byPosition.set(shift.positionName, existing);
    }
    return Array.from(byPosition.values()).map((summary) => ({
      date: day.date,
      positionId: summary.positionId,
      positionName: summary.positionName,
      shiftCount: summary.count,
      hours: roundHours(summary.hours),
    }));
  });
  return {
    ...empty,
    employeeRows,
    openShiftRow: {
      employeeId: null,
      displayName: "Open Shifts",
      shifts: openShifts,
      weeklyTotalHours: roundHours(openShifts.reduce((total, shift) => total + shift.hours, 0)),
    },
    shifts,
    dailyTotals,
    weeklyTotalHours: roundHours(shifts.reduce((total, shift) => total + shift.hours, 0)),
    coverageSummary,
    warnings: makeWarnings(location, await getLocationHours(ctx, locationId), shifts),
    isPublished: schedule.isPublished,
    publishedAt: schedule.publishedAt ?? null,
    updatedAt: schedule.updatedAt,
  };
}

export const getWeek = query({
  args: { locationId: v.id("locations"), weekStartDate: v.string() },
  handler: async (ctx, args) => {
    await requireLocationManager(ctx, args.locationId);
    return await buildWeek(ctx, args.locationId, args.weekStartDate, false);
  },
});

export const upsertShift = mutation({
  args: {
    locationId: v.id("locations"),
    weekStartDate: v.string(),
    shiftId: v.optional(v.id("shifts")),
    employeeId: v.optional(v.union(v.id("employees"), v.null())),
    positionId: v.id("positions"),
    startAt: v.number(),
    endAt: v.number(),
    plannedBreakMinutes: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireLocationManager(ctx, args.locationId);
    const location = await ctx.db.get(args.locationId);
    const position = await ctx.db.get(args.positionId);
    if (!location || !position || position.locationId !== args.locationId) {
      throw new ConvexError({ code: "INVALID_SHIFT", message: "Invalid location or position." });
    }
    const employeeId: Id<"employees"> | undefined = args.employeeId ?? undefined;
    if (employeeId && !(await isEmployeeAssignedToLocation(ctx, employeeId, args.locationId))) {
      throw new ConvexError({ code: "INVALID_EMPLOYEE", message: "Employee is not assigned to location." });
    }
    const schedule = await getOrCreateSchedule(ctx, location, args.weekStartDate);
    const timestamp = Date.now();
    const shiftData = {
      scheduleId: schedule._id,
      locationId: args.locationId,
      positionId: args.positionId,
      startAt: args.startAt,
      endAt: args.endAt,
      startBusinessDate: formatIsoDateInTimezone(args.startAt, location.timezone),
      plannedBreakMinutes: args.plannedBreakMinutes ?? 0,
      updatedAt: timestamp,
    };
    const optionalShiftData = {
      ...(employeeId !== undefined ? { employeeId } : {}),
      ...(args.notes !== undefined ? { notes: args.notes } : {}),
    };
    if (args.shiftId) {
      const existing = await ctx.db.get(args.shiftId);
      if (!existing || existing.scheduleId !== schedule._id) {
        throw new ConvexError({ code: "NOT_FOUND", message: "Shift not found in this week." });
      }
      await ctx.db.replace(args.shiftId, {
        ...shiftData,
        ...optionalShiftData,
        createdAt: existing.createdAt,
      });
      await ctx.db.patch(schedule._id, { updatedAt: timestamp });
      return await ctx.db.get(args.shiftId);
    }
    const shiftId = await ctx.db.insert("shifts", {
      ...shiftData,
      ...optionalShiftData,
      createdAt: timestamp,
    });
    await ctx.db.patch(schedule._id, { updatedAt: timestamp });
    return await ctx.db.get(shiftId);
  },
});

export const deleteShift = mutation({
  args: { shiftId: v.id("shifts") },
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) {
      return { deleted: false };
    }
    await requireLocationManager(ctx, shift.locationId);
    await ctx.db.delete(args.shiftId);
    await ctx.db.patch(shift.scheduleId, { updatedAt: Date.now() });
    return { deleted: true };
  },
});

export const duplicateShift = mutation({
  args: { shiftId: v.id("shifts"), startAt: v.optional(v.number()), endAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const shift = await ctx.db.get(args.shiftId);
    if (!shift) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Shift not found." });
    }
    await requireLocationManager(ctx, shift.locationId);
    const location = await ctx.db.get(shift.locationId);
    if (!location) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Location not found." });
    }
    const timestamp = Date.now();
    const startAt = args.startAt ?? shift.startAt + 7 * 24 * 60 * 60 * 1000;
    const endAt = args.endAt ?? shift.endAt + 7 * 24 * 60 * 60 * 1000;
    const newShift = {
      scheduleId: shift.scheduleId,
      locationId: shift.locationId,
      positionId: shift.positionId,
      startAt,
      endAt,
      startBusinessDate: formatIsoDateInTimezone(startAt, location.timezone),
      plannedBreakMinutes: shift.plannedBreakMinutes,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const newShiftId = await ctx.db.insert("shifts", {
      ...newShift,
      ...(shift.employeeId !== undefined ? { employeeId: shift.employeeId } : {}),
      ...(shift.notes !== undefined ? { notes: shift.notes } : {}),
    });
    await ctx.db.patch(shift.scheduleId, { updatedAt: timestamp });
    return await ctx.db.get(newShiftId);
  },
});

export const publishWeek = mutation({
  args: { locationId: v.id("locations"), weekStartDate: v.string() },
  handler: async (ctx, args) => {
    await requireLocationManager(ctx, args.locationId);
    const location = await ctx.db.get(args.locationId);
    if (!location) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Location not found." });
    }
    const schedule = await getOrCreateSchedule(ctx, location, args.weekStartDate);
    const timestamp = Date.now();
    await ctx.db.patch(schedule._id, {
      isPublished: true,
      publishedAt: schedule.publishedAt ?? timestamp,
      updatedAt: timestamp,
    });
    return await buildWeek(ctx, args.locationId, args.weekStartDate, false);
  },
});

export const getEmployeePublishedSchedule = query({
  args: { employeeId: v.id("employees") },
  handler: async (ctx, args) => {
    const employee = await ctx.db.get(args.employeeId);
    if (!employee || !employee.active) {
      return { employee: null, weeks: [] };
    }
    const assignments = await ctx.db
      .query("employeeLocations")
      .withIndex("by_employeeId", (q) => q.eq("employeeId", args.employeeId))
      .take(50);
    const weeks = [];
    for (const assignment of assignments) {
      if (!assignment.active) {
        continue;
      }
      const location = await ctx.db.get(assignment.locationId);
      if (!location) {
        continue;
      }
      const today = formatIsoDateInTimezone(Date.now(), location.timezone);
      const currentWeekStart = getWeekStartDate(today, location.weekStartDay);
      for (const weekStartDate of [currentWeekStart, addDays(currentWeekStart, 7)]) {
        const week = await buildWeek(ctx, assignment.locationId, weekStartDate, true);
        const employeeRow = week.employeeRows.find((row) => row.employeeId === args.employeeId);
        const openShiftRow = week.openShiftRow;
        if (week.isPublished) {
          weeks.push({
            locationId: assignment.locationId,
            locationName: location.name,
            timezone: location.timezone,
            weekStartDate,
            days: week.days,
            assignedShifts: employeeRow?.shifts ?? [],
            openShifts: openShiftRow.shifts,
            weeklyTotalHours: employeeRow?.weeklyTotalHours ?? 0,
          });
        }
      }
    }
    return {
      employee: {
        id: employee._id,
        displayName: employee.displayName,
        avatarUrl: employee.avatarUrl,
        role: employee.role,
      },
      weeks,
    };
  },
});
