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

export function formatDayColumnHeader(iso: string, day: ScheduleDay): string {
  const date = parseDate(iso);
  const dayNum = String(date.getDate()).padStart(2, "0");
  return `${dayNum} ${day.toUpperCase()}`;
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
