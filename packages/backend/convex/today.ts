import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  getEmployeeMap,
  getPositionMap,
  getWeekStartDate,
  hoursBetween,
  requireLocationManager,
  roundHours,
} from "./shared";

function scheduledShiftModel(
  shift: Doc<"shifts">,
  employee: Doc<"employees"> | undefined,
  position: Doc<"positions"> | undefined,
) {
  return {
    shiftId: shift._id,
    employeeId: shift.employeeId ?? null,
    displayName: employee?.displayName ?? "Open Shift",
    avatarUrl: employee?.avatarUrl ?? null,
    role: employee?.role ?? "employee",
    positionId: shift.positionId,
    positionName: position?.name ?? "Unknown",
    startAt: shift.startAt,
    endAt: shift.endAt,
    businessDate: shift.startBusinessDate,
    scheduledHours: roundHours(hoursBetween(shift.startAt, shift.endAt, shift.plannedBreakMinutes)),
  };
}

function timecardModel(
  timecard: Doc<"timecards">,
  employee: Doc<"employees"> | undefined,
  position: Doc<"positions"> | undefined,
  location: Doc<"locations">,
) {
  return {
    timecardId: timecard._id,
    employeeId: timecard.employeeId,
    displayName: employee?.displayName ?? "Unknown",
    avatarUrl: employee?.avatarUrl ?? null,
    role: employee?.role ?? "employee",
    positionName: position?.name ?? null,
    locationName: location.name,
    timezone: location.timezone,
    businessDate: timecard.businessDate,
    status: timecard.status,
    attendanceStatus: timecard.attendanceStatus,
    clockInAt: timecard.clockInAt,
    clockOutAt: timecard.clockOutAt ?? null,
    workedHours: roundHours(
      hoursBetween(timecard.clockInAt, timecard.clockOutAt ?? Date.now(), timecard.totalBreakMinutes),
    ),
    totalBreakMinutes: timecard.totalBreakMinutes,
  };
}

export const getDashboard = query({
  args: { locationId: v.id("locations"), businessDate: v.string() },
  handler: async (ctx, args) => {
    await requireLocationManager(ctx, args.locationId);
    const location = await ctx.db.get(args.locationId);
    if (!location) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Location not found." });
    }
    const weekStartDate = getWeekStartDate(args.businessDate, location.weekStartDay);
    const schedule = await ctx.db
      .query("schedules")
      .withIndex("by_locationId_and_weekStartDate", (q) =>
        q.eq("locationId", args.locationId).eq("weekStartDate", weekStartDate),
      )
      .unique();
    const shifts =
      schedule?.isPublished === true
        ? (
            await ctx.db
              .query("shifts")
              .withIndex("by_scheduleId", (q) => q.eq("scheduleId", schedule._id))
              .take(300)
          ).filter((shift) => shift.startBusinessDate === args.businessDate)
        : [];
    const timecards = await ctx.db
      .query("timecards")
      .withIndex("by_locationId_and_businessDate", (q) =>
        q.eq("locationId", args.locationId).eq("businessDate", args.businessDate),
      )
      .take(200);
    const employees = await getEmployeeMap(ctx, location.companyId);
    const positions = await getPositionMap(ctx, args.locationId);
    const timecardsByShift = new Map(timecards.filter((row) => row.shiftId).map((row) => [row.shiftId!, row]));
    const scheduledNotClockedIn = [];
    const noShows = [];
    const now = Date.now();
    for (const shift of shifts.filter((row) => row.employeeId)) {
      if (!timecardsByShift.has(shift._id)) {
        const model = scheduledShiftModel(shift, employees.get(shift.employeeId!), positions.get(shift.positionId));
        if (now > shift.startAt + location.noShowThresholdMinutes * 60 * 1000) {
          noShows.push({ ...model, status: "no_show" });
        } else {
          scheduledNotClockedIn.push({ ...model, status: "scheduled" });
        }
      }
    }

    const punchRows = timecards.map((timecard) => {
      const shift = timecard.shiftId ? shifts.find((candidate) => candidate._id === timecard.shiftId) : null;
      return timecardModel(
        timecard,
        employees.get(timecard.employeeId),
        shift ? positions.get(shift.positionId) : undefined,
        location,
      );
    });
    const recentEvents = [];
    for (const timecard of timecards) {
      const employee = employees.get(timecard.employeeId);
      const events = await ctx.db
        .query("timeEvents")
        .withIndex("by_timecardId", (q) => q.eq("timecardId", timecard._id))
        .take(50);
      for (const event of events) {
        recentEvents.push({
          eventId: event._id,
          timecardId: timecard._id,
          employeeId: timecard.employeeId,
          displayName: employee?.displayName ?? "Unknown",
          avatarUrl: employee?.avatarUrl ?? null,
          type: event.type,
          occurredAt: event.occurredAt,
          source: event.source,
          note: event.note ?? null,
        });
      }
    }

    const clockedIn = punchRows.filter((row) => row.status === "clocked_in");
    const onBreak = punchRows.filter((row) => row.status === "on_break");
    const clockedOut = punchRows.filter((row) => row.status === "clocked_out");
    const unscheduledClockIns = punchRows.filter((row) => row.attendanceStatus === "unscheduled");
    const late = punchRows.filter((row) => row.attendanceStatus === "late");
    return {
      locationId: location._id,
      locationName: location.name,
      timezone: location.timezone,
      businessDate: args.businessDate,
      schedule: {
        scheduleId: schedule?._id ?? null,
        isPublished: schedule?.isPublished ?? false,
        scheduledShiftCount: shifts.length,
      },
      scheduledNotClockedIn,
      clockedIn,
      onBreak,
      clockedOut,
      unscheduledClockIns,
      noShows,
      late,
      recentPunches: recentEvents.sort((a, b) => b.occurredAt - a.occurredAt).slice(0, 12),
      quickCounts: {
        scheduled: shifts.filter((shift) => shift.employeeId).length,
        scheduledNotClockedIn: scheduledNotClockedIn.length,
        clockedIn: clockedIn.length,
        onBreak: onBreak.length,
        clockedOut: clockedOut.length,
        unscheduledClockIns: unscheduledClockIns.length,
        noShows: noShows.length,
        late: late.length,
      },
    };
  },
});
