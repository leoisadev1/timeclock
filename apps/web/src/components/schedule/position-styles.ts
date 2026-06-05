import type { Position } from "@/lib/timeclock-types";

type ShiftBadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

export type PositionCardStyle = {
  card: string;
  title: string;
  meta: string;
  footer: string;
  dot: string;
  badge: ShiftBadgeTone;
};

export const POSITION_CARD_STYLES: Record<Position, PositionCardStyle> = {
  Manager: {
    card: "border-emerald-500/25 bg-emerald-500/10 shadow-emerald-500/5",
    title: "text-emerald-950 dark:text-emerald-50",
    meta: "text-emerald-800/80 dark:text-emerald-100/80",
    footer: "text-emerald-700/70 dark:text-emerald-200/70",
    dot: "bg-emerald-500",
    badge: "success",
  },
  "Shift Lead": {
    card: "border-sky-500/25 bg-sky-500/10 shadow-sky-500/5",
    title: "text-sky-950 dark:text-sky-50",
    meta: "text-sky-800/80 dark:text-sky-100/80",
    footer: "text-sky-700/70 dark:text-sky-200/70",
    dot: "bg-sky-500",
    badge: "info",
  },
  Barista: {
    card: "border-violet-500/25 bg-violet-500/10 shadow-violet-500/5",
    title: "text-violet-950 dark:text-violet-50",
    meta: "text-violet-800/80 dark:text-violet-100/80",
    footer: "text-violet-700/70 dark:text-violet-200/70",
    dot: "bg-violet-500",
    badge: "primary",
  },
  Cashier: {
    card: "border-rose-500/25 bg-rose-500/10 shadow-rose-500/5",
    title: "text-rose-950 dark:text-rose-50",
    meta: "text-rose-800/80 dark:text-rose-100/80",
    footer: "text-rose-700/70 dark:text-rose-200/70",
    dot: "bg-rose-500",
    badge: "danger",
  },
  Cook: {
    card: "border-teal-500/25 bg-teal-500/10 shadow-teal-500/5",
    title: "text-teal-950 dark:text-teal-50",
    meta: "text-teal-800/80 dark:text-teal-100/80",
    footer: "text-teal-700/70 dark:text-teal-200/70",
    dot: "bg-teal-500",
    badge: "success",
  },
  Server: {
    card: "border-amber-500/30 bg-amber-400/15 shadow-amber-500/5",
    title: "text-amber-950 dark:text-amber-50",
    meta: "text-amber-900/80 dark:text-amber-100/80",
    footer: "text-amber-800/70 dark:text-amber-200/70",
    dot: "bg-amber-500",
    badge: "warning",
  },
};

export const OPEN_SHIFT_STYLE: PositionCardStyle = {
  card: "border-dashed border-border bg-muted/40 shadow-none",
  title: "text-foreground",
  meta: "text-muted-foreground",
  footer: "text-muted-foreground",
  dot: "bg-muted-foreground/50",
  badge: "neutral",
};

export function positionStyle(position: Position): PositionCardStyle {
  return POSITION_CARD_STYLES[position] ?? OPEN_SHIFT_STYLE;
}
