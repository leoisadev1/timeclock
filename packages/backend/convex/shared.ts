import { ConvexError } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const DEMO_COMPANY_SLUG = "coastal-cafe-group";
export const MINUTE_MS = 60 * 1000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export type Role = Doc<"employees">["role"];
export type ReaderCtx = QueryCtx | MutationCtx;
export type PunchSource = "station" | "employee_web" | "manager_edit";
export type AttendanceStatus = Doc<"timecards">["attendanceStatus"];

export function error(code: string, message: string): ConvexError<{ code: string; message: string }> {
  return new ConvexError({ code, message });
}

export async function getDemoCompany(ctx: ReaderCtx): Promise<Doc<"companies"> | null> {
  return await ctx.db
    .query("companies")
    .withIndex("by_slug", (q) => q.eq("slug", DEMO_COMPANY_SLUG))
    .unique();
}

export async function requireDemoCompany(ctx: ReaderCtx): Promise<Doc<"companies">> {
  const company = await getDemoCompany(ctx);
  if (!company) {
    throw error("DEMO_NOT_SEEDED", "Run demo.bootstrap or seed.ensureDemoData first.");
  }
  return company;
}

export async function getCurrentEmployee(ctx: ReaderCtx): Promise<Doc<"employees"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const byToken = await ctx.db
    .query("employees")
    .withIndex("by_authTokenIdentifier", (q) =>
      q.eq("authTokenIdentifier", identity.tokenIdentifier),
    )
    .unique();
  if (byToken) {
    return byToken;
  }

  if (identity.email) {
    return await ctx.db
      .query("employees")
      .withIndex("by_email", (q) => q.eq("email", identity.email ?? ""))
      .unique();
  }

  return null;
}

export async function requireCurrentEmployee(ctx: ReaderCtx): Promise<Doc<"employees">> {
  const employee = await getCurrentEmployee(ctx);
  if (!employee || !employee.active) {
    throw error("NOT_AUTHORIZED", "An active employee account is required.");
  }
  return employee;
}

export function requireRole(employee: Doc<"employees">, roles: Role[]): void {
  if (!roles.includes(employee.role)) {
    throw error("NOT_AUTHORIZED", "This action requires elevated access.");
  }
}

export async function canManageLocation(
  ctx: ReaderCtx,
  employee: Doc<"employees">,
  locationId: Id<"locations">,
): Promise<boolean> {
  if (employee.role === "admin") {
    return true;
  }
  if (employee.role !== "manager") {
    return false;
  }
  const assignment = await ctx.db
    .query("managerLocations")
    .withIndex("by_managerId_and_locationId", (q) =>
      q.eq("managerId", employee._id).eq("locationId", locationId),
    )
    .unique();
  return assignment?.active === true;
}

export async function requireLocationManager(
  ctx: ReaderCtx,
  locationId: Id<"locations">,
): Promise<Doc<"employees">> {
  const employee = await requireCurrentEmployee(ctx);
  requireRole(employee, ["admin", "manager"]);
  if (!(await canManageLocation(ctx, employee, locationId))) {
    throw error("LOCATION_ACCESS_DENIED", "You do not manage this location.");
  }
  return employee;
}

export async function isEmployeeAssignedToLocation(
  ctx: ReaderCtx,
  employeeId: Id<"employees">,
  locationId: Id<"locations">,
): Promise<boolean> {
  const assignment = await ctx.db
    .query("employeeLocations")
    .withIndex("by_employeeId_and_locationId", (q) =>
      q.eq("employeeId", employeeId).eq("locationId", locationId),
    )
    .unique();
  return assignment?.active === true;
}

export function formatIsoDateInTimezone(timestamp: number, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

export function dayOfWeekFromIsoDate(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function getWeekStartDate(date: string, weekStartDay: number): string {
  const dayOfWeek = dayOfWeekFromIsoDate(date);
  const delta = (dayOfWeek - weekStartDay + 7) % 7;
  return addDays(date, -delta);
}

function getTimezoneParts(timestamp: number, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestamp));
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function getTimezoneOffset(timestamp: number, timezone: string): number {
  const parts = getTimezoneParts(timestamp, timezone);
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

export function zonedTimestamp(date: string, minutesAfterMidnight: number, timezone: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const hour = Math.floor(minutesAfterMidnight / 60);
  const minute = minutesAfterMidnight % 60;
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const firstPass = utcGuess - getTimezoneOffset(utcGuess, timezone);
  return utcGuess - getTimezoneOffset(firstPass, timezone);
}

export function minutesSinceMidnight(timestamp: number, timezone: string): number {
  const parts = getTimezoneParts(timestamp, timezone);
  return parts.hour * 60 + parts.minute;
}

export function hoursBetween(startAt: number, endAt: number, breakMinutes = 0): number {
  return Math.max(0, (endAt - startAt) / HOUR_MS - breakMinutes / 60);
}

export function roundHours(hours: number): number {
  return Math.round(hours * 100) / 100;
}

export function classifyAttendance(clockInAt: number, shiftStartAt: number | null): AttendanceStatus {
  if (shiftStartAt === null) {
    return "unscheduled";
  }
  const deltaMinutes = (clockInAt - shiftStartAt) / MINUTE_MS;
  if (deltaMinutes < -5) {
    return "early";
  }
  if (deltaMinutes > 5) {
    return "late";
  }
  return "on_time";
}

export async function findPublishedSchedule(
  ctx: ReaderCtx,
  locationId: Id<"locations">,
  weekStartDate: string,
): Promise<Doc<"schedules"> | null> {
  const schedule = await ctx.db
    .query("schedules")
    .withIndex("by_locationId_and_weekStartDate", (q) =>
      q.eq("locationId", locationId).eq("weekStartDate", weekStartDate),
    )
    .unique();
  return schedule?.isPublished ? schedule : null;
}

export async function getPositionMap(
  ctx: ReaderCtx,
  locationId: Id<"locations">,
): Promise<Map<Id<"positions">, Doc<"positions">>> {
  const positions = await ctx.db
    .query("positions")
    .withIndex("by_locationId", (q) => q.eq("locationId", locationId))
    .take(100);
  return new Map(positions.map((position) => [position._id, position]));
}

export async function getEmployeeMap(
  ctx: ReaderCtx,
  companyId: Id<"companies">,
): Promise<Map<Id<"employees">, Doc<"employees">>> {
  const employees = await ctx.db
    .query("employees")
    .withIndex("by_companyId", (q) => q.eq("companyId", companyId))
    .take(200);
  return new Map(employees.map((employee) => [employee._id, employee]));
}

export async function getLocationHours(
  ctx: ReaderCtx,
  locationId: Id<"locations">,
): Promise<Doc<"locationHours">[]> {
  return await ctx.db
    .query("locationHours")
    .withIndex("by_locationId", (q) => q.eq("locationId", locationId))
    .take(7);
}

export function employeeName(employee: Doc<"employees"> | undefined): string {
  return employee?.displayName ?? "Open Shift";
}

export function timecardSnapshot(timecard: Doc<"timecards">) {
  return {
    clockInAt: timecard.clockInAt,
    clockOutAt: timecard.clockOutAt ?? null,
    status: timecard.status,
    attendanceStatus: timecard.attendanceStatus,
    totalBreakMinutes: timecard.totalBreakMinutes,
    shiftId: timecard.shiftId ?? null,
  };
}
