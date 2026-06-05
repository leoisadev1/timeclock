import { parseDate, toDateString } from "@timeclock/ui/components/calendar";

export const SCHEDULE_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export type ScheduleDay = (typeof SCHEDULE_DAYS)[number];

export const DAY_OFFSET: Record<ScheduleDay, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

export function addDays(date: string, days: number): string {
  const parsed = parseDate(date);
  parsed.setDate(parsed.getDate() + days);
  return toDateString(parsed);
}

export function getMondayWeekStart(date: string): string {
  const parsed = parseDate(date);
  const weekday = parsed.getDay();
  const diff = weekday === 0 ? -6 : 1 - weekday;
  parsed.setDate(parsed.getDate() + diff);
  return toDateString(parsed);
}

export function formatWeekRange(weekStart: string): string {
  const start = parseDate(weekStart);
  const end = parseDate(addDays(weekStart, 6));
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

export function formatWeekMonthLabel(weekStart: string): string {
  const start = parseDate(weekStart);
  const end = parseDate(addDays(weekStart, 6));
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  const startPart = start.toLocaleDateString("en-US", { month: "short" });
  const endPart = end.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  return `${startPart} – ${endPart}`;
}

/** e.g. "Week of Mon, Jun 8" */
export function formatWeekOfLabel(weekStart: string): string {
  const start = parseDate(weekStart);
  const weekday = start.toLocaleDateString("en-US", { weekday: "short" });
  const rest = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `Week of ${weekday}, ${rest}`;
}

/** e.g. "Mon 8" for column headers */
export function formatDayColumnHeader(iso: string, day: ScheduleDay): string {
  const date = parseDate(iso);
  return `${day} ${date.getDate()}`;
}

/** e.g. "MON 8" — uppercase day label for schedule grid headers */
export function formatDayColumnHeaderUpper(iso: string, day: ScheduleDay): string {
  const date = parseDate(iso);
  return `${day.toUpperCase()} ${date.getDate()}`;
}

/** e.g. "Aug 24, 2025 – Aug 30, 2025" for toolbar date range */
export function formatWeekRangeLong(weekStart: string): string {
  const start = parseDate(weekStart);
  const end = parseDate(addDays(weekStart, 6));
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

/** "11:00 AM" → "11:00am" (drops ":00" → "11am" for whole hours) */
export function formatCompactTime(time: string): string {
  const match = time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    return time;
  }
  const hour = Number.parseInt(match[1] ?? "0", 10);
  const minutes = match[2];
  const meridiem = (match[3] ?? "AM").toLowerCase();
  if (minutes === "00") {
    return `${hour}${meridiem}`;
  }
  return `${hour}:${minutes}${meridiem}`;
}

/** e.g. "9am-5pm" for schedule shift cards */
export function formatCompactTimeRange(start: string, end: string): string {
  return `${formatCompactTime(start)}-${formatCompactTime(end)}`;
}

export function isTodayIso(iso: string): boolean {
  const today = toDateString(new Date());
  return iso === today;
}

export function weekDatesFromStart(weekStart: string) {
  return SCHEDULE_DAYS.map((day) => ({
    day,
    iso: addDays(weekStart, DAY_OFFSET[day]),
  }));
}
