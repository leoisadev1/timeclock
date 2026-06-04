import {
  businessDate,
  currentWeekStart,
  employees,
  events,
  locations,
  nextWeekStart,
  schedules,
  timecards,
} from "./demo-data";
import type {
  AttendanceStatus,
  Employee,
  EmployeePortal,
  LocationId,
  PunchAction,
  PunchSource,
  ReportRow,
  ScheduleWeek,
  Shift,
  Timecard,
  TimecardStatus,
  TodayDashboard,
} from "./timeclock-types";

let demoSchedules: ScheduleWeek[] = schedules.map((schedule) => ({
  ...schedule,
  shifts: schedule.shifts.map((shift) => ({ ...shift })),
}));

export function getLocations() {
  return locations;
}

export function getEmployees(locationId: LocationId) {
  return employees.filter((employee) => employee.assignedLocationIds.includes(locationId));
}

export function getScheduleWeek(locationId: LocationId, weekStartDate = nextWeekStart) {
  return (
    demoSchedules.find(
      (schedule) => schedule.locationId === locationId && schedule.weekStartDate === weekStartDate,
    ) ?? createEmptySchedule(locationId, weekStartDate)
  );
}

export function saveScheduleWeek(schedule: ScheduleWeek) {
  const exists = demoSchedules.some((candidate) => candidate.id === schedule.id);
  demoSchedules = exists
    ? demoSchedules.map((candidate) => (candidate.id === schedule.id ? schedule : candidate))
    : [...demoSchedules, schedule];
  return schedule;
}

export function getTodayDashboard(locationId: LocationId): TodayDashboard {
  const location = getLocation(locationId);
  const schedule = getScheduleWeek(locationId, currentWeekStart);
  const todaysCards = timecards.filter(
    (card) => card.locationId === locationId && card.businessDate === businessDate,
  );
  const scheduledEmployeeIds = new Set(
    schedule.shifts.filter((shift) => shift.day === "Thu" && shift.employeeId).map((shift) => shift.employeeId),
  );
  const cardEmployeeIds = new Set(todaysCards.map((card) => card.employeeId));
  const scheduledNotClockedIn = employees.filter(
    (employee) => scheduledEmployeeIds.has(employee.id) && !cardEmployeeIds.has(employee.id),
  );
  const lateOrNoShow = schedule.shifts
    .filter((shift) => shift.day === "Thu" && shift.employeeId)
    .flatMap((shift) => {
      const card = todaysCards.find((timecard) => timecard.scheduledShiftId === shift.id);
      const employee = employees.find((candidate) => candidate.id === shift.employeeId);
      if (!employee) {
        return [];
      }
      if (!card) {
        return [{ employee, status: "no-show" as AttendanceStatus, shift }];
      }
      return card.attendance === "late" ? [{ employee, status: card.attendance, shift }] : [];
    });

  return {
    location,
    businessDate,
    schedule,
    scheduledNotClockedIn,
    clockedIn: todaysCards.filter((card) => card.status === "clocked-in"),
    onBreak: todaysCards.filter((card) => card.status === "on-break"),
    clockedOut: todaysCards.filter((card) => card.status === "clocked-out"),
    unscheduledClockIns: todaysCards.filter((card) => card.attendance === "unscheduled"),
    lateOrNoShow,
    recentEvents: events.filter((event) => event.locationId === locationId && event.businessDate === businessDate),
  };
}

export function getDailyReport(locationId: LocationId, reportDate = businessDate) {
  return buildReportRows(
    locationId,
    timecards.filter((timecard) => timecard.locationId === locationId && timecard.businessDate === reportDate),
    getScheduleWeek(locationId, currentWeekStart).shifts.filter((shift) => shift.day === "Thu"),
  );
}

export function getWeeklyReport(locationId: LocationId, weekStartDate = currentWeekStart) {
  return buildReportRows(
    locationId,
    timecards.filter((timecard) => timecard.locationId === locationId),
    getScheduleWeek(locationId, weekStartDate).shifts,
  );
}

export function getEmployeePortal(pin: string, locationId: LocationId): EmployeePortal | { errors: string[] } {
  const employee = employees.find((candidate) => candidate.pin === pin);
  const location = getLocation(locationId);
  if (!employee) {
    return { errors: ["Wrong PIN. Check the 4 digits and try again."] };
  }
  if (!employee.active) {
    return { errors: [`${employee.name} is inactive and cannot clock in.`] };
  }
  if (!employee.assignedLocationIds.includes(locationId)) {
    return { errors: [`${employee.name} is not assigned to ${location.name}.`] };
  }

  const todayEvents = events.filter(
    (event) =>
      event.employeeId === employee.id &&
      event.locationId === locationId &&
      event.businessDate === businessDate,
  );
  const recentHistory = timecards.filter(
    (timecard) => timecard.employeeId === employee.id && timecard.locationId === locationId,
  );
  const openTimecard = recentHistory.find((timecard) => timecard.status !== "clocked-out");
  const publishedSchedules = demoSchedules.filter(
    (schedule) => schedule.locationId === locationId && schedule.published,
  );

  return {
    employee,
    location,
    status: openTimecard?.status ?? "clocked-out",
    todayEvents,
    recentHistory,
    assignedShifts: publishedSchedules.flatMap((schedule) =>
      schedule.shifts.filter((shift) => shift.employeeId === employee.id),
    ),
    openShifts: publishedSchedules.flatMap((schedule) => schedule.shifts.filter((shift) => !shift.employeeId)),
    errors: openTimecard ? [`${employee.name} already has an open timecard.`] : [],
  };
}

export function getNextStatus(_status: TimecardStatus, action: PunchAction): TimecardStatus {
  if (action === "clock-in") {
    return "clocked-in";
  }
  if (action === "start-break") {
    return "on-break";
  }
  if (action === "end-break") {
    return "clocked-in";
  }
  return "clocked-out";
}

export function describeClockAction(employee: Employee, action: PunchAction, source: PunchSource) {
  const sourceLabel = source === "employee_web" ? "employee web" : source.replace("_", " ");
  return `${employee.name} ${action.replace("-", " ")} recorded from ${sourceLabel}. Backend persistence is ready to wire.`;
}

export function calculateShiftHours(shift: Shift) {
  const start = minutesFromTime(shift.start);
  let end = minutesFromTime(shift.end);
  if (end <= start || shift.overnight) {
    end += 24 * 60;
  }
  return Math.max(0, (end - start - shift.breakMinutes) / 60);
}

export function warningLabel(warning: Shift["warning"]) {
  if (warning === "overlap") {
    return "Overlap";
  }
  if (warning === "outside-hours") {
    return "Outside hours";
  }
  if (warning === "high-weekly-hours") {
    return "High weekly hours";
  }
  if (warning === "open-shift") {
    return "Open shift";
  }
  return undefined;
}

function getLocation(locationId: LocationId) {
  const location = locations.find((candidate) => candidate.id === locationId);
  if (!location) {
    throw new Error(`Unknown location ${locationId}`);
  }
  return location;
}

function createEmptySchedule(locationId: LocationId, weekStartDate: string): ScheduleWeek {
  return {
    id: `schedule-${locationId}-${weekStartDate}`,
    locationId,
    weekStartDate,
    published: false,
    updatedAt: "2026-06-04T10:00:00-04:00",
    shifts: [],
  };
}

function buildReportRows(locationId: LocationId, cards: Timecard[], shifts: Shift[]): ReportRow[] {
  return getEmployees(locationId)
    .filter((employee) => employee.active)
    .map((employee) => {
      const employeeCards = cards.filter((timecard) => timecard.employeeId === employee.id);
      const employeeShifts = shifts.filter((shift) => shift.employeeId === employee.id);
      const scheduledHours = employeeShifts.reduce((sum, shift) => sum + calculateShiftHours(shift), 0);
      const actualHours = employeeCards.reduce((sum, timecard) => sum + estimateActualHours(timecard), 0);
      return {
        employee,
        scheduledHours,
        actualHours,
        variance: actualHours - scheduledHours,
        breakHours: employeeCards.reduce((sum, timecard) => sum + timecard.breakMinutes / 60, 0),
        edited: employeeCards.some((timecard) => timecard.edited),
        attendance: employeeCards.map((timecard) => timecard.attendance),
      };
    });
}

function estimateActualHours(timecard: Timecard) {
  if (!timecard.clockIn) {
    return 0;
  }
  if (!timecard.clockOut) {
    return Math.max(0, 3.5 - timecard.breakMinutes / 60);
  }
  return Math.max(
    0,
    (minutesFromTime(timecard.clockOut) - minutesFromTime(timecard.clockIn) - timecard.breakMinutes) / 60,
  );
}

function minutesFromTime(value: string) {
  const match = value.match(/^(\d{1,2}):(\d{2})\s(AM|PM)$/);
  if (!match) {
    return 0;
  }
  const [, rawHour, rawMinute, period] = match;
  const hourNumber = Number(rawHour);
  const hour = period === "PM" && hourNumber !== 12 ? hourNumber + 12 : period === "AM" && hourNumber === 12 ? 0 : hourNumber;
  return hour * 60 + Number(rawMinute);
}
