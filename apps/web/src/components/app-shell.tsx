import { LocationSwitcher } from "@/components/location-switcher";
import type { Location, LocationId } from "@/lib/timeclock-types";
import { Link } from "@tanstack/react-router";
import {
  BarChart3Icon,
  CalendarDaysIcon,
  Clock3Icon,
  MonitorIcon,
  Settings2Icon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export type ManagerView = "today" | "schedule" | "employees" | "reports" | "settings";

const NAV: Array<{ id: ManagerView; label: string; icon: typeof Clock3Icon }> = [
  { id: "today", label: "Today", icon: Clock3Icon },
  { id: "schedule", label: "Schedule", icon: CalendarDaysIcon },
  { id: "employees", label: "Employees", icon: UsersIcon },
  { id: "reports", label: "Reports", icon: BarChart3Icon },
  { id: "settings", label: "Settings", icon: Settings2Icon },
];

interface AppShellProps {
  activeView: ManagerView;
  locations: Location[];
  locationId: LocationId;
  onLocationChange: (locationId: LocationId) => void;
  onViewChange: (view: ManagerView) => void;
  children: ReactNode;
}

export function AppShell({
  activeView,
  locations,
  locationId,
  onLocationChange,
  onViewChange,
  children,
}: AppShellProps) {
  const activeLocation = locations.find((l) => l.id === locationId) ?? locations[0];

  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      {/* ─── Desktop sidebar ─── */}
      <aside className="hidden lg:flex w-[220px] shrink-0 flex-col bg-sidebar">
        {/* Workspace / logo block */}
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center gap-2.5 rounded-xl bg-sidebar-accent/50 px-3 py-2.5 transition-colors duration-150 hover:bg-sidebar-accent">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Clock3Icon className="size-4 text-primary-foreground" strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground leading-tight">Timeclock</p>
              <p className="truncate text-xs text-sidebar-foreground/50 leading-tight">Manager workspace</p>
            </div>
          </div>
        </div>

        {/* Location picker */}
        <div className="px-3 pb-3">
          <LocationSwitcher locations={locations} value={locationId} onChange={onLocationChange} compact />
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = activeView === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onViewChange(id)}
                className={[
                  "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium",
                  "transition-all duration-200 ease-out",
                  "active:scale-[0.98]",
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                ].join(" ")}
              >
                <Icon
                  className={`size-4 shrink-0 transition-colors duration-150 ${active ? "text-primary" : "group-hover:text-sidebar-foreground/80"}`}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                <span className="flex-1">{label}</span>
                {active && (
                  <span className="size-1.5 shrink-0 rounded-full bg-primary animate-in fade-in-0 duration-200" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom links */}
        <div className="px-2 pb-3 pt-2 border-t border-sidebar-border/50 space-y-0.5 mt-2">
          <Link
            to="/employee"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/50 transition-all duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <UserRoundIcon className="size-4 shrink-0" strokeWidth={1.8} />
            Employee portal
          </Link>
          <Link
            to="/station"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/50 transition-all duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <MonitorIcon className="size-4 shrink-0" strokeWidth={1.8} />
            Station kiosk
          </Link>
          <Link
            to="/"
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-sidebar-foreground/30 transition-all duration-150 hover:text-sidebar-foreground/60"
          >
            Back to home
          </Link>
        </div>
      </aside>

      {/* ─── Main content ─── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-sidebar px-4 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Clock3Icon className="size-4 text-primary-foreground" strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold text-sidebar-foreground">Timeclock</span>
          </div>
          <div className="w-40">
            <LocationSwitcher locations={locations} value={locationId} onChange={onLocationChange} compact />
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex shrink-0 gap-1 overflow-x-auto px-3 py-2 bg-sidebar lg:hidden">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = activeView === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onViewChange(id)}
                className={[
                  "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                  "transition-all duration-150 active:scale-95",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                ].join(" ")}
              >
                <Icon className="size-3.5 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </button>
            );
          })}
        </nav>

        {/* Page */}
        <main className="flex-1 overflow-y-auto">
          {/* Page header strip with location name */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-5 py-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{activeLocation?.name}</span>
            </div>
          </div>
          <div className="p-5">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
