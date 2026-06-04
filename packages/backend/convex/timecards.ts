import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  addDays,
  classifyAttendance,
  formatIsoDateInTimezone,
  getWeekStartDate,
  HOUR_MS,
  hoursBetween,
  isEmployeeAssignedToLocation,
  requireLocationManager,
  roundHours,
  timecardSnapshot,
  type ReaderCtx,
} from "./shared";

const sourceValidator = v.union(
  v.literal("station"),
  v.literal("employee_web"),
  v.literal("manager_edit"),
);

async function getOpenTimecard(ctx: ReaderCtx, employeeId: Id<"employees">) {
  const clockedIn = await ctx.db
    .query("timecards")
    .withIndex("by_employeeId_and_status", (q) =>
      q.eq("employeeId", employeeId).eq("status", "clocked_in"),
    )
    .take(1);
  if (clockedIn[0]) {
    return clockedIn[0];
  }
  const onBreak = await ctx.db
    .query("timecards")
    .withIndex("by_employeeId_and_status", (q) =>
      q.eq("employeeId", employeeId).eq("status", "on_break"),
    )
    .take(1);
  return onBreak[0] ?? null;
}

async function matchShift(
  ctx: ReaderCtx,
  employee: Doc<"employees">,
  location: Doc<"locations">,
  clockInAt: number,
) {
  const businessDate = formatIsoDateInTimezone(clockInAt, location.timezone);
  const weekStartDate = getWeekStartDate(businessDate, location.weekStartDay);
  const schedule = await ctx.db
    .query("schedules")
    .withIndex("by_locationId_and_weekStartDate", (q) =>
      q.eq("locationId", location._id).eq("weekStartDate", weekStartDate),
    )
    .unique();
  if (!schedule?.isPublished) {
    return null;
  }
  const shifts = await ctx.db
    .query("shifts")
    .withIndex("by_scheduleId", (q) => q.eq("scheduleId", schedule._id))
    .take(300);
  const candidates = shifts
    .filter(
      (shift) =>
        shift.employeeId === employee._id &&
        shift.locationId === location._id &&
        shift.startBusinessDate === businessDate &&
        Math.abs(shift.startAt - clockInAt) <= 2 * HOUR_MS,
    )
    .sort((a, b) => Math.abs(a.startAt - clockInAt) - Math.abs(b.startAt - clockInAt));
  return candidates[0] ?? null;
}

async function timecardReadModel(ctx: ReaderCtx, timecard: Doc<"timecards">) {
  const employee = await ctx.db.get(timecard.employeeId);
  const location = await ctx.db.get(timecard.locationId);
  const shift = timecard.shiftId ? await ctx.db.get(timecard.shiftId) : null;
  const position = shift ? await ctx.db.get(shift.positionId) : null;
  const events = await ctx.db
    .query("timeEvents")
    .withIndex("by_timecardId", (q) => q.eq("timecardId", timecard._id))
    .take(50);
  const edits = await ctx.db
    .query("timecardEdits")
    .withIndex("by_timecardId", (q) => q.eq("timecardId", timecard._id))
    .take(20);
  const workedHours =
    timecard.clockOutAt !== undefined
      ? roundHours(hoursBetween(timecard.clockInAt, timecard.clockOutAt, timecard.totalBreakMinutes))
      : roundHours(hoursBetween(timecard.clockInAt, Date.now(), timecard.totalBreakMinutes));
  return {
    id: timecard._id,
    employeeId: timecard.employeeId,
    employeeName: employee?.displayName ?? "Unknown",
    avatarUrl: employee?.avatarUrl ?? null,
    role: employee?.role ?? "employee",
    locationId: timecard.locationId,
    locationName: location?.name ?? "",
    timezone: location?.timezone ?? "UTC",
    businessDate: timecard.businessDate,
    shiftId: timecard.shiftId ?? null,
    positionName: position?.name ?? null,
    status: timecard.status,
    attendanceStatus: timecard.attendanceStatus,
    clockInAt: timecard.clockInAt,
    clockOutAt: timecard.clockOutAt ?? null,
    totalBreakMinutes: timecard.totalBreakMinutes,
    workedHours,
    source: timecard.source,
    edited: edits.length > 0,
    events: events
      .sort((a, b) => a.occurredAt - b.occurredAt)
      .map((event) => ({
        id: event._id,
        type: event.type,
        occurredAt: event.occurredAt,
        source: event.source,
        note: event.note ?? null,
      })),
  };
}

export const getCurrentStatus = query({
  args: { employeeId: v.id("employees"), locationId: v.id("locations") },
  handler: async (ctx, args) => {
    const employee = await ctx.db.get(args.employeeId);
    const location = await ctx.db.get(args.locationId);
    if (!employee || !employee.active || !location) {
      return null;
    }
    if (!(await isEmployeeAssignedToLocation(ctx, args.employeeId, args.locationId))) {
      return null;
    }
    const open = await getOpenTimecard(ctx, args.employeeId);
    const today = formatIsoDateInTimezone(Date.now(), location.timezone);
    const recent = await ctx.db
      .query("timecards")
      .withIndex("by_employeeId_and_businessDate", (q) =>
        q.eq("employeeId", args.employeeId).eq("businessDate", today),
      )
      .take(20);
    return {
      employee: {
        id: employee._id,
        displayName: employee.displayName,
        avatarUrl: employee.avatarUrl,
        role: employee.role,
      },
      location: {
        id: location._id,
        name: location.name,
        timezone: location.timezone,
      },
      businessDate: today,
      status: open?.status ?? "clocked_out",
      openTimecard: open ? await timecardReadModel(ctx, open) : null,
      todayTimecards: await Promise.all(recent.map((timecard) => timecardReadModel(ctx, timecard))),
    };
  },
});

export const clockIn = mutation({
  args: {
    employeeId: v.id("employees"),
    locationId: v.id("locations"),
    source: sourceValidator,
    occurredAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const employee = await ctx.db.get(args.employeeId);
    const location = await ctx.db.get(args.locationId);
    if (!employee || !employee.active || !location?.active) {
      throw new ConvexError({ code: "INVALID_EMPLOYEE", message: "Active employee and location required." });
    }
    if (!(await isEmployeeAssignedToLocation(ctx, args.employeeId, args.locationId))) {
      throw new ConvexError({ code: "LOCATION_ACCESS_DENIED", message: "Employee is not assigned here." });
    }
    if (await getOpenTimecard(ctx, args.employeeId)) {
      throw new ConvexError({ code: "OPEN_TIMECARD_EXISTS", message: "Employee already has an open timecard." });
    }
    const clockInAt = args.occurredAt ?? Date.now();
    const businessDate = formatIsoDateInTimezone(clockInAt, location.timezone);
    const shift = await matchShift(ctx, employee, location, clockInAt);
    const timestamp = Date.now();
    const timecardId = await ctx.db.insert("timecards", {
      companyId: employee.companyId,
      locationId: args.locationId,
      employeeId: args.employeeId,
      businessDate,
      clockInAt,
      status: "clocked_in",
      attendanceStatus: classifyAttendance(clockInAt, shift?.startAt ?? null),
      totalBreakMinutes: 0,
      source: args.source,
      createdAt: timestamp,
      updatedAt: timestamp,
      ...(shift ? { shiftId: shift._id } : {}),
    });
    await ctx.db.insert("timeEvents", {
      timecardId,
      type: "clock_in",
      occurredAt: clockInAt,
      source: args.source,
      createdAt: timestamp,
    });
    return await timecardReadModel(ctx, (await ctx.db.get(timecardId))!);
  },
});

export const startBreak = mutation({
  args: { employeeId: v.id("employees"), source: sourceValidator, occurredAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const timecard = await getOpenTimecard(ctx, args.employeeId);
    if (!timecard || timecard.status !== "clocked_in") {
      throw new ConvexError({ code: "INVALID_STATUS", message: "Employee is not clocked in." });
    }
    const timestamp = Date.now();
    await ctx.db.patch(timecard._id, { status: "on_break", updatedAt: timestamp });
    await ctx.db.insert("timeEvents", {
      timecardId: timecard._id,
      type: "start_break",
      occurredAt: args.occurredAt ?? timestamp,
      source: args.source,
      createdAt: timestamp,
    });
    return await timecardReadModel(ctx, (await ctx.db.get(timecard._id))!);
  },
});

export const endBreak = mutation({
  args: { employeeId: v.id("employees"), source: sourceValidator, occurredAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const timecard = await getOpenTimecard(ctx, args.employeeId);
    if (!timecard || timecard.status !== "on_break") {
      throw new ConvexError({ code: "INVALID_STATUS", message: "Employee is not on break." });
    }
    const occurredAt = args.occurredAt ?? Date.now();
    const events = await ctx.db
      .query("timeEvents")
      .withIndex("by_timecardId", (q) => q.eq("timecardId", timecard._id))
      .take(50);
    const lastBreakStart = events
      .filter((event) => event.type === "start_break")
      .sort((a, b) => b.occurredAt - a.occurredAt)[0];
    const addedBreakMinutes = lastBreakStart
      ? Math.max(0, Math.round((occurredAt - lastBreakStart.occurredAt) / (60 * 1000)))
      : 0;
    const timestamp = Date.now();
    await ctx.db.patch(timecard._id, {
      status: "clocked_in",
      totalBreakMinutes: timecard.totalBreakMinutes + addedBreakMinutes,
      updatedAt: timestamp,
    });
    await ctx.db.insert("timeEvents", {
      timecardId: timecard._id,
      type: "end_break",
      occurredAt,
      source: args.source,
      createdAt: timestamp,
    });
    return await timecardReadModel(ctx, (await ctx.db.get(timecard._id))!);
  },
});

export const clockOut = mutation({
  args: { employeeId: v.id("employees"), source: sourceValidator, occurredAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const timecard = await getOpenTimecard(ctx, args.employeeId);
    if (!timecard) {
      throw new ConvexError({ code: "INVALID_STATUS", message: "Employee has no open timecard." });
    }
    let totalBreakMinutes = timecard.totalBreakMinutes;
    const clockOutAt = args.occurredAt ?? Date.now();
    if (timecard.status === "on_break") {
      const events = await ctx.db
        .query("timeEvents")
        .withIndex("by_timecardId", (q) => q.eq("timecardId", timecard._id))
        .take(50);
      const lastBreakStart = events
        .filter((event) => event.type === "start_break")
        .sort((a, b) => b.occurredAt - a.occurredAt)[0];
      if (lastBreakStart) {
        totalBreakMinutes += Math.max(0, Math.round((clockOutAt - lastBreakStart.occurredAt) / (60 * 1000)));
      }
    }
    const timestamp = Date.now();
    await ctx.db.patch(timecard._id, {
      status: "clocked_out",
      clockOutAt,
      totalBreakMinutes,
      updatedAt: timestamp,
    });
    await ctx.db.insert("timeEvents", {
      timecardId: timecard._id,
      type: "clock_out",
      occurredAt: clockOutAt,
      source: args.source,
      createdAt: timestamp,
    });
    return await timecardReadModel(ctx, (await ctx.db.get(timecard._id))!);
  },
});

export const managerCorrectTimecard = mutation({
  args: {
    timecardId: v.id("timecards"),
    clockInAt: v.optional(v.number()),
    clockOutAt: v.optional(v.union(v.number(), v.null())),
    totalBreakMinutes: v.optional(v.number()),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const timecard = await ctx.db.get(args.timecardId);
    if (!timecard) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Timecard not found." });
    }
    const actor = await requireLocationManager(ctx, timecard.locationId);
    if (args.note.trim().length === 0) {
      throw new ConvexError({ code: "NOTE_REQUIRED", message: "Corrections require a note." });
    }
    const before = timecardSnapshot(timecard);
    const clockInAt = args.clockInAt ?? timecard.clockInAt;
    const clockOutAt = args.clockOutAt === undefined ? timecard.clockOutAt : (args.clockOutAt ?? undefined);
    const status = clockOutAt === undefined ? timecard.status : "clocked_out";
    const replacement = {
      companyId: timecard.companyId,
      locationId: timecard.locationId,
      employeeId: timecard.employeeId,
      businessDate: timecard.businessDate,
      clockInAt,
      totalBreakMinutes: args.totalBreakMinutes ?? timecard.totalBreakMinutes,
      status,
      attendanceStatus: timecard.attendanceStatus,
      source: timecard.source,
      createdAt: timecard.createdAt,
      updatedAt: Date.now(),
    };
    await ctx.db.replace(args.timecardId, {
      ...replacement,
      ...(timecard.shiftId !== undefined ? { shiftId: timecard.shiftId } : {}),
      ...(clockOutAt !== undefined ? { clockOutAt } : {}),
    });
    const updated = (await ctx.db.get(args.timecardId))!;
    await ctx.db.insert("timecardEdits", {
      timecardId: args.timecardId,
      editedByEmployeeId: actor._id,
      editedAt: Date.now(),
      before,
      after: timecardSnapshot(updated),
      note: args.note,
    });
    await ctx.db.insert("timeEvents", {
      timecardId: args.timecardId,
      type: "manager_edit",
      occurredAt: Date.now(),
      source: "manager_edit",
      note: args.note,
      createdAt: Date.now(),
    });
    return await timecardReadModel(ctx, updated);
  },
});

export const listRecentForEmployee = query({
  args: { employeeId: v.id("employees"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const employee = await ctx.db.get(args.employeeId);
    if (!employee) {
      return [];
    }
    const assignments = await ctx.db
      .query("employeeLocations")
      .withIndex("by_employeeId", (q) => q.eq("employeeId", args.employeeId))
      .take(20);
    const dates = new Set<string>();
    for (const assignment of assignments) {
      const location = await ctx.db.get(assignment.locationId);
      if (location) {
        const today = formatIsoDateInTimezone(Date.now(), location.timezone);
        for (let index = 0; index < (args.days ?? 7); index += 1) {
          dates.add(addDays(today, -index));
        }
      }
    }
    const rows = [];
    for (const date of dates) {
      const timecards = await ctx.db
        .query("timecards")
        .withIndex("by_employeeId_and_businessDate", (q) =>
          q.eq("employeeId", args.employeeId).eq("businessDate", date),
        )
        .take(20);
      for (const timecard of timecards) {
        rows.push(await timecardReadModel(ctx, timecard));
      }
    }
    return rows.sort((a, b) => b.clockInAt - a.clockInAt);
  },
});
