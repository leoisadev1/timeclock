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
    card: "border-[#2f7f83] bg-[#3b8589] shadow-[#3b8589]/10",
    title: "text-white",
    meta: "text-white/90",
    footer: "text-white/85",
    dot: "bg-[#3b8589]",
    badge: "success",
  },
  "Shift Lead": {
    card: "border-[#346f73] bg-[#3a7f82] shadow-[#3a7f82]/10",
    title: "text-white",
    meta: "text-white/90",
    footer: "text-white/85",
    dot: "bg-[#3a7f82]",
    badge: "info",
  },
  Barista: {
    card: "border-[#2f7376] bg-[#3a8081] shadow-[#3a8081]/10",
    title: "text-white",
    meta: "text-white/90",
    footer: "text-white/85",
    dot: "bg-[#3a8081]",
    badge: "primary",
  },
  Cashier: {
    card: "border-[#367dcc] bg-[#407fd0] shadow-[#407fd0]/10",
    title: "text-white",
    meta: "text-white/90",
    footer: "text-white/85",
    dot: "bg-[#407fd0]",
    badge: "danger",
  },
  Cook: {
    card: "border-[#e2ce4f] bg-[#f0df64] shadow-[#f0df64]/10",
    title: "text-[#241544]",
    meta: "text-[#241544]/85",
    footer: "text-[#241544]/75",
    dot: "bg-[#f0df64]",
    badge: "success",
  },
  Server: {
    card: "border-[#346fca] bg-[#437fd2] shadow-[#437fd2]/10",
    title: "text-white",
    meta: "text-white/90",
    footer: "text-white/85",
    dot: "bg-[#437fd2]",
    badge: "warning",
  },
};

export const OPEN_SHIFT_STYLE: PositionCardStyle = {
  card: "border-dashed border-[#c9c3b5] bg-[#f7f6f1] shadow-none",
  title: "text-foreground",
  meta: "text-muted-foreground",
  footer: "text-muted-foreground",
  dot: "bg-muted-foreground/50",
  badge: "neutral",
};

export function positionStyle(position: Position): PositionCardStyle {
  return POSITION_CARD_STYLES[position] ?? OPEN_SHIFT_STYLE;
}
