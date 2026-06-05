import type { Position } from "@/lib/timeclock-types";

type ShiftBadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

export type PositionCardStyle = {
  card: string;
  bar: string;
  title: string;
  meta: string;
  footer: string;
  dot: string;
  badge: ShiftBadgeTone;
};

/** Solid fill shift cards — chunky centered pills like reference scheduling UI. */
export const POSITION_CARD_STYLES: Record<Position, PositionCardStyle> = {
  Manager: {
    card: "border-[#5c4a78] bg-[#5c4a78]",
    bar: "bg-[#5c4a78]",
    title: "text-white",
    meta: "text-white/90",
    footer: "text-white/80",
    dot: "bg-[#5c4a78]",
    badge: "primary",
  },
  "Shift Lead": {
    card: "border-[#6b5890] bg-[#6b5890]",
    bar: "bg-[#6b5890]",
    title: "text-white",
    meta: "text-white/90",
    footer: "text-white/80",
    dot: "bg-[#6b5890]",
    badge: "info",
  },
  Barista: {
    card: "border-[#3d7a7a] bg-[#3d7a7a]",
    bar: "bg-[#3d7a7a]",
    title: "text-white",
    meta: "text-white/90",
    footer: "text-white/85",
    dot: "bg-[#3d7a7a]",
    badge: "info",
  },
  Cashier: {
    card: "border-[#3b82c4] bg-[#3b82c4]",
    bar: "bg-[#3b82c4]",
    title: "text-white",
    meta: "text-white/90",
    footer: "text-white/85",
    dot: "bg-[#3b82c4]",
    badge: "primary",
  },
  Cook: {
    card: "border-[#f2d96d] bg-[#f2d96d]",
    bar: "bg-[#f2d96d]",
    title: "text-[#1a1a1a]",
    meta: "text-[#2a2a2a]/90",
    footer: "text-[#2a2a2a]/75",
    dot: "bg-[#f2d96d]",
    badge: "success",
  },
  Server: {
    card: "border-[#4a8fb8] bg-[#4a8fb8]",
    bar: "bg-[#4a8fb8]",
    title: "text-white",
    meta: "text-white/90",
    footer: "text-white/85",
    dot: "bg-[#4a8fb8]",
    badge: "warning",
  },
};

export const OPEN_SHIFT_STYLE: PositionCardStyle = {
  card: "border-dashed border-border/70 bg-muted/50",
  bar: "bg-muted-foreground/40",
  title: "text-foreground",
  meta: "text-muted-foreground",
  footer: "text-muted-foreground",
  dot: "bg-muted-foreground/50",
  badge: "neutral",
};

export function positionStyle(position: Position): PositionCardStyle {
  return POSITION_CARD_STYLES[position] ?? OPEN_SHIFT_STYLE;
}
