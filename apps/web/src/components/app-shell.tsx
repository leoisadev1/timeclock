import { AppLogo } from "@/components/app-logo";
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

const VIEW_LABEL: Record<ManagerView, string> = {
  today: "Today",
  schedule: "Schedule",
  employees: "Employees",
  reports: "Reports",
  settings: "Settings",
};

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
      {/* Desktop sidebar — flat, sidebar tokens */}
      <aside className="hidden w-[220px] shrink-0 flex-col bg-sidebar lg:flex">
        <div className="px-3 pt-4 pb-2">
          <div className="motion-product flex items-center gap-2.5 rounded-xl bg-sidebar-accent/50 px-3 py-2.5 hover:bg-sidebar-accent">
            <AppLogo className="size-8" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight text-sidebar-foreground">
                Timeclock
              </p>
              <p className="truncate text-xs leading-tight text-sidebar-foreground/50">
                Manager workspace
              </p>
            </div>
          </div>
        </div>

        <div className="px-3 pb-3">
          <LocationSwitcher locations={locations} value={locationId} onChange={onLocationChange} compact />
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = activeView === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onViewChange(id)}
                className={[
                  "motion-product motion-press group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium",
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground shadow-sm"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                ].join(" ")}
              >
                <Icon
                  className={`size-4 shrink-0 ${active ? "text-primary" : "text-sidebar-foreground/50 group-hover:text-sidebar-foreground/80"}`}
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

        <div className="mt-2 space-y-0.5 border-t border-sidebar-border/50 px-2 pb-3 pt-2">
          <Link
            to="/employee"
            className="motion-product motion-press flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <UserRoundIcon className="size-4 shrink-0" strokeWidth={1.8} />
            Employee portal
          </Link>
          <Link
            to="/station"
            className="motion-product motion-press flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <MonitorIcon className="size-4 shrink-0" strokeWidth={1.8} />
            Station kiosk
          </Link>
          <Link
            to="/"
            className="motion-product flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-sidebar-foreground/30 hover:text-sidebar-foreground/60"
          >
            Back to home
          </Link>
        </div>
      </aside>

      {/* Main column — muted canvas + inset rounded panel */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-muted/30">
        {/* Mobile chrome */}
        <header className="flex h-14 shrink-0 items-center justify-between bg-sidebar px-4 lg:hidden">
          <div className="flex items-center gap-2.5">
            <AppLogo className="size-7" />
            <span className="text-sm font-semibold text-sidebar-foreground">Timeclock</span>
          </div>
          <div className="w-44">
            <LocationSwitcher locations={locations} value={locationId} onChange={onLocationChange} compact />
          </div>
        </header>

        <nav className="flex shrink-0 gap-1 overflow-x-auto bg-sidebar px-3 py-2 lg:hidden">
          {NAV.map(({ id, label, icon: Icon }) => {
            const active = activeView === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onViewChange(id)}
                className={[
                  "motion-product motion-press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
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

        <main className="flex min-h-0 flex-1 flex-col p-3 lg:p-4">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
            <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm sm:px-5">
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-foreground">
                  {VIEW_LABEL[activeView]}
                </h1>
                <p className="truncate text-xs text-muted-foreground">{activeLocation?.name}</p>
              </div>
            </header>

            <div
              key={activeView}
              className="animate-view-enter min-h-0 flex-1 overflow-y-auto p-4 sm:p-5"
            >
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
