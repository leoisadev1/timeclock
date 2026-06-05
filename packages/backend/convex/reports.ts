import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import {
  addDays,
  getEmployeeMap,
  getPositionMap,
  getWeekStartDate,
  hoursBetween,
  requireLocationManager,
  roundHours,
  type ReaderCtx,
} from "./shared";

type TimecardReportRow = {
  timecardId: Id<"timecards">;
  shiftId: Id<"shifts"> | null;
  clockInAt: number;
  clockOutAt: number | null;
  status: Doc<"timecards">["status"];
  attendanceStatus: Doc<"timecards">["attendanceStatus"];
  actualHours: number;
  breakMinutes: number;
  source: Doc<"timecards">["source"];
  edited: boolean;
  editNote: string | null;
};

type DailyReportRow = {
  employeeId: Id<"employees">;
  displayName: string;
  avatarUrl: string | null;
  role: Doc<"employees">["role"];
  positionName: string | null;
  scheduledHours: number;
  actualHours: number;
  varianceHours: number;
  breakMinutes: number;
  statuses: Doc<"timecards">["attendanceStatus"][];
  timecards: TimecardReportRow[];
  scheduledShifts: Array<{
    shiftId: Id<"shifts">;
    positionName: string;
    startAt: number;
    endAt: number;
    scheduledHours: number;
  }>;
};

async function getPublishedShiftsForDate(
  ctx: ReaderCtx,
  location: Doc<"locations">,
  businessDate: string,
) {
  const weekStartDate = getWeekStartDate(businessDate, location.weekStartDay);
  const schedule = await ctx.db
    .query("schedules")
    .withIndex("by_locationId_and_weekStartDate", (q) =>
      q.eq("locationId", location._id).eq("weekStartDate", weekStartDate),
    )
    .unique();
  if (!schedule?.isPublished) {
    return [];
  }
  const shifts = await ctx.db
    .query("shifts")
    .withIndex("by_scheduleId", (q) => q.eq("scheduleId", schedule._id))
    .take(300);
  return shifts.filter((shift) => shift.startBusinessDate === businessDate);
}

function scheduledHours(shifts: Doc<"shifts">[]) {
  return shifts.reduce(
    (total, shift) => total + hoursBetween(shift.startAt, shift.endAt, shift.plannedBreakMinutes),
    0,
  );
}

function actualHours(timecards: Doc<"timecards">[]) {
  return timecards.reduce(
    (total, timecard) =>
      total +
      (timecard.clockOutAt
        ? hoursBetween(timecard.clockInAt, timecard.clockOutAt, timecard.totalBreakMinutes)
        : 0),
    0,
  );
}

async function latestEdit(ctx: ReaderCtx, timecardId: Id<"timecards">) {
  const edits = await ctx.db
    .query("timecardEdits")
    .withIndex("by_timecardId", (q) => q.eq("timecardId", timecardId))
    .take(20);
  return edits.sort((a, b) => b.editedAt - a.editedAt)[0] ?? null;
}

async function buildDailyTimesheet(
  ctx: ReaderCtx,
  locationId: Id<"locations">,
  businessDate: string,
) {
  const location = await ctx.db.get(locationId);
  if (!location) {
    throw new ConvexError({ code: "NOT_FOUND", message: "Location not found." });
  }
  const employees = await getEmployeeMap(ctx, location.companyId);
  const positions = await getPositionMap(ctx, locationId);
  const shifts = await getPublishedShiftsForDate(ctx, location, businessDate);
  const timecards = await ctx.db
    .query("timecards")
    .withIndex("by_locationId_and_businessDate", (q) =>
      q.eq("locationId", locationId).eq("businessDate", businessDate),
    )
    .take(200);
  const employeeIds = new Set<Id<"employees">>();
  for (const shift of shifts) {
    if (shift.employeeId) employeeIds.add(shift.employeeId);
  }
  for (const timecard of timecards) {
    employeeIds.add(timecard.employeeId);
  }

  const rows: DailyReportRow[] = [];
  for (const employeeId of employeeIds) {
    const employee = employees.get(employeeId);
    const employeeShifts = shifts.filter((shift) => shift.employeeId === employeeId);
    const employeeTimecards = timecards.filter((timecard) => timecard.employeeId === employeeId);
    const edits = new Map<Id<"timecards">, Doc<"timecardEdits">>();
    for (const timecard of employeeTimecards) {
      const edit = await latestEdit(ctx, timecard._id);
      if (edit) {
        edits.set(timecard._id, edit);
      }
    }
    const scheduled = scheduledHours(employeeShifts);
    const actual = actualHours(employeeTimecards);
    rows.push({
      employeeId,
      displayName: employee?.displayName ?? "Unknown",
      avatarUrl: employee?.avatarUrl ?? null,
      role: employee?.role ?? "employee",
      positionName:
        employeeShifts[0] !== undefined
          ? (positions.get(employeeShifts[0].positionId)?.name ?? null)
          : null,
      scheduledHours: roundHours(scheduled),
      actualHours: roundHours(actual),
      varianceHours: roundHours(actual - scheduled),
      breakMinutes: employeeTimecards.reduce(
        (total, timecard) => total + timecard.totalBreakMinutes,
        0,
      ),
      statuses: Array.from(new Set(employeeTimecards.map((timecard) => timecard.attendanceStatus))),
      timecards: employeeTimecards
        .sort((a, b) => a.clockInAt - b.clockInAt)
        .map((timecard) => {
          const edit = edits.get(timecard._id);
          return {
            timecardId: timecard._id,
            shiftId: timecard.shiftId ?? null,
            clockInAt: timecard.clockInAt,
            clockOutAt: timecard.clockOutAt ?? null,
            status: timecard.status,
            attendanceStatus: timecard.attendanceStatus,
            actualHours: roundHours(actualHours([timecard])),
            breakMinutes: timecard.totalBreakMinutes,
            source: timecard.source,
            edited: edit !== undefined,
            editNote: edit?.note ?? null,
          };
        }),
      scheduledShifts: employeeShifts
        .sort((a, b) => a.startAt - b.startAt)
        .map((shift) => ({
          shiftId: shift._id,
          positionName: positions.get(shift.positionId)?.name ?? "Unknown",
          startAt: shift.startAt,
          endAt: shift.endAt,
          scheduledHours: roundHours(
            hoursBetween(shift.startAt, shift.endAt, shift.plannedBreakMinutes),
          ),
        })),
    });
  }

  const sortedRows = rows.sort((a, b) => a.displayName.localeCompare(b.displayName));
  return {
    locationId: location._id,
    locationName: location.name,
    timezone: location.timezone,
    businessDate,
    rows: sortedRows,
    totals: {
      scheduledHours: roundHours(sortedRows.reduce((total, row) => total + row.scheduledHours, 0)),
      actualHours: roundHours(sortedRows.reduce((total, row) => total + row.actualHours, 0)),
      varianceHours: roundHours(sortedRows.reduce((total, row) => total + row.varianceHours, 0)),
      breakMinutes: sortedRows.reduce((total, row) => total + row.breakMinutes, 0),
      editedTimecards: sortedRows.reduce(
        (total, row) => total + row.timecards.filter((timecard) => timecard.edited).length,
        0,
      ),
      late: sortedRows.reduce(
        (total, row) =>
          total + row.timecards.filter((timecard) => timecard.attendanceStatus === "late").length,
        0,
      ),
      unscheduled: sortedRows.reduce(
        (total, row) =>
          total +
          row.timecards.filter((timecard) => timecard.attendanceStatus === "unscheduled").length,
        0,
      ),
    },
  };
}

export const dailyTimesheet = query({
  args: { locationId: v.id("locations"), businessDate: v.string() },
  handler: async (ctx, args) => {
    await requireLocationManager(ctx, args.locationId);
    return await buildDailyTimesheet(ctx, args.locationId, args.businessDate);
  },
});

export const weeklySummary = query({
  args: { locationId: v.id("locations"), weekStartDate: v.string() },
  handler: async (ctx, args) => {
    await requireLocationManager(ctx, args.locationId);
    const location = await ctx.db.get(args.locationId);
    if (!location) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Location not found." });
    }
    const byEmployee = new Map<
      Id<"employees">,
      {
        employeeId: Id<"employees">;
        displayName: string;
        avatarUrl: string | null;
        role: Doc<"employees">["role"];
        scheduledHours: number;
        actualHours: number;
        breakMinutes: number;
        late: number;
        early: number;
        unscheduled: number;
        editedTimecards: number;
      }
    >();
    const employees = await getEmployeeMap(ctx, location.companyId);
    for (let index = 0; index < 7; index += 1) {
      const businessDate = addDays(args.weekStartDate, index);
      const daily = await buildDailyTimesheet(ctx, args.locationId, businessDate);
      for (const row of daily.rows) {
        const employee = employees.get(row.employeeId);
        const existing = byEmployee.get(row.employeeId) ?? {
          employeeId: row.employeeId,
          displayName: row.displayName,
          avatarUrl: employee?.avatarUrl ?? null,
          role: employee?.role ?? "employee",
          scheduledHours: 0,
          actualHours: 0,
          breakMinutes: 0,
          late: 0,
          early: 0,
          unscheduled: 0,
          editedTimecards: 0,
        };
        existing.scheduledHours += row.scheduledHours;
        existing.actualHours += row.actualHours;
        existing.breakMinutes += row.breakMinutes;
        existing.late += row.timecards.filter(
          (timecard) => timecard.attendanceStatus === "late",
        ).length;
        existing.early += row.timecards.filter(
          (timecard) => timecard.attendanceStatus === "early",
        ).length;
        existing.unscheduled += row.timecards.filter(
          (timecard) => timecard.attendanceStatus === "unscheduled",
        ).length;
        existing.editedTimecards += row.timecards.filter((timecard) => timecard.edited).length;
        byEmployee.set(row.employeeId, existing);
      }
    }
    const rows = Array.from(byEmployee.values()).map((row) => ({
      ...row,
      scheduledHours: roundHours(row.scheduledHours),
      actualHours: roundHours(row.actualHours),
      varianceHours: roundHours(row.actualHours - row.scheduledHours),
    }));
    return {
      locationId: location._id,
      locationName: location.name,
      timezone: location.timezone,
      weekStartDate: args.weekStartDate,
      rows: rows.sort((a, b) => a.displayName.localeCompare(b.displayName)),
      totals: {
        scheduledHours: roundHours(rows.reduce((total, row) => total + row.scheduledHours, 0)),
        actualHours: roundHours(rows.reduce((total, row) => total + row.actualHours, 0)),
        varianceHours: roundHours(rows.reduce((total, row) => total + row.varianceHours, 0)),
        breakMinutes: rows.reduce((total, row) => total + row.breakMinutes, 0),
        late: rows.reduce((total, row) => total + row.late, 0),
        early: rows.reduce((total, row) => total + row.early, 0),
        unscheduled: rows.reduce((total, row) => total + row.unscheduled, 0),
        editedTimecards: rows.reduce((total, row) => total + row.editedTimecards, 0),
      },
    };
  },
});
