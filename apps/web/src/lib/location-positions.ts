import type { LocationPosition } from "@/lib/timeclock-types";

export const DEMO_POSITIONS: LocationPosition[] = [
  { id: "pos-manager", name: "Manager", color: "emerald", active: true },
  { id: "pos-shift-lead", name: "Shift Lead", color: "sky", active: true },
  { id: "pos-barista", name: "Barista", color: "violet", active: true },
  { id: "pos-cashier", name: "Cashier", color: "rose", active: true },
  { id: "pos-cook", name: "Cook", color: "teal", active: true },
  { id: "pos-server", name: "Server", color: "amber", active: true },
];

export const POSITION_COLOR_OPTIONS = [
  { id: "emerald", dot: "bg-emerald-500", ring: "ring-emerald-500/40" },
  { id: "sky", dot: "bg-sky-500", ring: "ring-sky-500/40" },
  { id: "violet", dot: "bg-violet-500", ring: "ring-violet-500/40" },
  { id: "rose", dot: "bg-rose-500", ring: "ring-rose-500/40" },
  { id: "teal", dot: "bg-teal-500", ring: "ring-teal-500/40" },
  { id: "amber", dot: "bg-amber-500", ring: "ring-amber-500/40" },
  { id: "orange", dot: "bg-orange-500", ring: "ring-orange-500/40" },
  { id: "zinc", dot: "bg-zinc-500", ring: "ring-zinc-500/40" },
] as const;

export function positionColorClasses(color: string) {
  return POSITION_COLOR_OPTIONS.find((option) => option.id === color) ?? POSITION_COLOR_OPTIONS[0];
}
