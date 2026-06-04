import { LocationSwitcher } from "@/components/location-switcher";
import type { Location, LocationId } from "@/lib/timeclock-types";
import { Link } from "@tanstack/react-router";
import {
  BarChart3Icon,
  CalendarDaysIcon,
  Clock3Icon,
  MonitorIcon,
  Settings2Icon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export type ManagerView = "today" | "schedule" | "employees" | "reports" | "settings";

const navItems: Array<{ id: ManagerView; label: string; icon: typeof Clock3Icon }> = [
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
  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-52 shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
        {/* Logo */}
        <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Clock3Icon className="size-4 text-primary-foreground" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold text-sidebar-foreground">Timeclock</span>
        </div>

        {/* Location selector */}
        <div className="border-b border-sidebar-border px-3 py-3">
          <LocationSwitcher
            locations={locations}
            value={locationId}
            onChange={onLocationChange}
            compact
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-0.5">
          <p className="px-2.5 pb-1.5 pt-0.5 text-[10px] uppercase tracking-wider text-sidebar-foreground/40">
            Menu
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                className={`w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium transition-[background-color,color,transform] duration-150 active:translate-y-px ${
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <Icon
                  className={`size-4 shrink-0 ${active ? "text-primary" : ""}`}
                  strokeWidth={1.8}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {active && (
                  <span className="size-1.5 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer links */}
        <div className="border-t border-sidebar-border p-2 space-y-0.5">
          <Link
            to="/employee"
            className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium text-sidebar-foreground/50 transition-[background-color,color] duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <UserIcon className="size-4 shrink-0" strokeWidth={1.8} />
            Employee portal
          </Link>
          <Link
            to="/station"
            className="w-full flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs font-medium text-sidebar-foreground/50 transition-[background-color,color] duration-150 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <MonitorIcon className="size-4 shrink-0" strokeWidth={1.8} />
            Station kiosk
          </Link>
          <Link
            to="/"
            className="block px-2.5 py-1.5 text-[10px] text-sidebar-foreground/40 transition-colors duration-150 hover:text-sidebar-foreground/60"
          >
            Back to home
          </Link>
        </div>
      </aside>

      {/* Mobile layout */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden lg:hidden">
        {/* Mobile header */}
        <header className="h-14 shrink-0 border-b bg-sidebar px-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary">
              <Clock3Icon className="size-4 text-primary-foreground" strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold text-sidebar-foreground">Timeclock</span>
          </div>
          <div className="w-40">
            <LocationSwitcher
              locations={locations}
              value={locationId}
              onChange={onLocationChange}
              compact
            />
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex overflow-x-auto border-b bg-sidebar/80 px-2 py-1.5 gap-0.5 shrink-0">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onViewChange(item.id)}
                className={`flex shrink-0 items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-medium transition-[background-color,color,transform] duration-150 active:translate-y-px ${
                  active
                    ? "bg-sidebar-accent text-sidebar-foreground"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                }`}
              >
                <Icon
                  className={`size-3.5 shrink-0 ${active ? "text-primary" : ""}`}
                  strokeWidth={1.8}
                />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Mobile content */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>
      </div>

      {/* Desktop content */}
      <main className="hidden lg:flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </main>
    </div>
  );
}
