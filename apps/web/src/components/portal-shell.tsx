import { AppLogo } from "@/components/app-logo";
import { ManagerSidebarBrand } from "@/components/manager-sidebar-brand";
import { Link } from "@tanstack/react-router";
import {
  Building2Icon,
  ChevronRightIcon,
  HomeIcon,
  MonitorIcon,
  RadioIcon,
  UserRoundIcon,
} from "lucide-react";
import type { ReactNode } from "react";

export type PortalMode = "home" | "activity" | "employee" | "station";

const PORTAL_NAV: Array<{
  id: PortalMode | "manager";
  label: string;
  to: "/" | "/activity" | "/dashboard" | "/employee" | "/station";
  icon: typeof HomeIcon;
}> = [
  { id: "activity", label: "Activity", to: "/activity", icon: RadioIcon },
  { id: "manager", label: "Manager", to: "/dashboard", icon: Building2Icon },
  { id: "employee", label: "Employee clock-in", to: "/employee", icon: UserRoundIcon },
  { id: "station", label: "Clock-in station", to: "/station", icon: MonitorIcon },
];

function navItemActive(id: PortalMode | "manager", mode: PortalMode): boolean {
  if (id === "manager") return false;
  return id === mode;
}

interface PortalShellProps {
  mode: PortalMode;
  title?: string;
  subtitle?: string;
  headerActions?: ReactNode;
  children: ReactNode;
  fullBleed?: boolean;
}

export function PortalShell({
  mode,
  title,
  subtitle,
  headerActions,
  children,
  fullBleed = false,
}: PortalShellProps) {
  const mobileTitle =
    title ??
    (mode === "home"
      ? "Activity"
      : mode === "activity"
        ? "Activity"
      : mode === "employee"
        ? "Employee clock-in"
        : "Clock-in station");

  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      <aside className="hidden w-[220px] shrink-0 flex-col bg-sidebar lg:flex">
        <ManagerSidebarBrand />

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pt-1">
          {PORTAL_NAV.map(({ id, label, to, icon: Icon }) => {
            const active = navItemActive(id, mode);
            return (
              <Link
                key={id}
                to={to}
                className={[
                  "motion-product motion-press group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium",
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
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-muted/30">
        <header className="flex h-14 shrink-0 items-center justify-between bg-sidebar px-4 lg:hidden">
          <div className="flex min-w-0 items-center gap-2.5">
            <AppLogo className="size-9 shrink-0" />
            <span className="truncate text-lg font-bold tracking-tight text-sidebar-foreground">
              {mobileTitle}
            </span>
          </div>
          {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
        </header>

        <nav className="flex shrink-0 gap-1 overflow-x-auto bg-sidebar px-3 py-2 lg:hidden">
          {PORTAL_NAV.map(({ id, label, to, icon: Icon }) => {
            const active = navItemActive(id, mode);
            return (
              <Link
                key={id}
                to={to}
                className={[
                  "motion-product motion-press flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                ].join(" ")}
              >
                <Icon className="size-3.5 shrink-0" strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            );
          })}
        </nav>

        <main className="flex min-h-0 flex-1 flex-col p-3 lg:p-4">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
            {(title || subtitle || headerActions) && (
              <header className="hidden shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5 sm:py-4 lg:flex">
                <div className="min-w-0">
                  {title ? (
                    <h1 className="text-lg font-semibold tracking-tight text-foreground">{title}</h1>
                  ) : null}
                  {subtitle ? (
                    <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
                  ) : null}
                </div>
                {headerActions ? (
                  <div className="flex shrink-0 items-center gap-2">{headerActions}</div>
                ) : null}
              </header>
            )}

            <div
              className={
                fullBleed
                  ? "flex min-h-0 flex-1 flex-col overflow-hidden"
                  : "min-h-0 flex-1 overflow-y-auto p-4 sm:p-5"
              }
            >
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export const scheduleSurfaceClass =
  "overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border";

export function PortalWorkflowRow({
  icon: Icon,
  title,
  description,
  to,
  accent = false,
}: {
  icon: typeof Building2Icon;
  title: string;
  description: string;
  to: "/" | "/dashboard" | "/employee" | "/station";
  accent?: boolean;
}) {
  return (
    <Link
      to={to}
      className={[
        "motion-product motion-press group flex items-center gap-3 rounded-xl px-3 py-3 ring-1 transition-[background-color,box-shadow] duration-150",
        accent
          ? "bg-primary/5 ring-primary/25 hover:bg-primary/10 hover:ring-primary/40"
          : "bg-muted/20 ring-border hover:bg-muted/40",
      ].join(" ")}
    >
      <span
        className={[
          "flex size-10 shrink-0 items-center justify-center rounded-lg",
          accent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        ].join(" ")}
      >
        <Icon className="size-5" strokeWidth={1.8} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <ChevronRightIcon
        className={`size-4 shrink-0 ${accent ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}
        strokeWidth={2}
      />
    </Link>
  );
}
