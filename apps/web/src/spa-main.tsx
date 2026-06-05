import "./index.css";

import { createRoot } from "react-dom/client";
import {
  ActivityIcon,
  CalendarDaysIcon,
  Clock3Icon,
  CoffeeIcon,
  LogOutIcon,
  RadioIcon,
  TimerIcon,
  UsersIcon,
} from "lucide-react";

const employees = [
  { name: "Avery Morgan", role: "Manager", status: "Working", time: "4:12", color: "bg-emerald-500" },
  { name: "Maya Chen", role: "Barista", status: "Working", time: "3:44", color: "bg-blue-500" },
  { name: "Jordan Lee", role: "Shift Lead", status: "On break", time: "2:18", color: "bg-amber-500" },
  { name: "Sam Rivera", role: "Cashier", status: "Working", time: "1:56", color: "bg-violet-500" },
  { name: "Nina Patel", role: "Cook", status: "Working", time: "1:21", color: "bg-rose-500" },
];

const events = [
  ["Maya Chen", "Clocked in", "9:02 AM", TimerIcon],
  ["Jordan Lee", "Started break", "10:41 AM", CoffeeIcon],
  ["Avery Morgan", "Clocked in", "8:31 AM", TimerIcon],
  ["Sam Rivera", "Clocked in", "11:05 AM", TimerIcon],
  ["Riley Brooks", "Clocked out", "1:18 PM", LogOutIcon],
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

function App() {
  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      <aside className="hidden w-[220px] shrink-0 flex-col bg-sidebar lg:flex">
        <div className="border-b border-sidebar-border/60 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Clock3Icon className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold">Timeclock</p>
              <p className="text-xs text-sidebar-foreground/50">Demo workspace</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-2 py-3">
          {[
            ["Activity", RadioIcon, true],
            ["Schedule", CalendarDaysIcon, false],
            ["Employees", UsersIcon, false],
          ].map(([label, Icon, active]) => (
            <button
              key={label as string}
              className={[
                "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium",
                active ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/55",
              ].join(" ")}
            >
              <Icon className="size-4" />
              {label as string}
            </button>
          ))}
        </nav>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col bg-muted/30 p-3 lg:p-4">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
          <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Coastal Cafe Group activity</h1>
              <p className="mt-1 text-xs text-muted-foreground">No-auth demo mode. Ready for two MacBooks.</p>
            </div>
            <div className="hidden items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary sm:flex">
              <RadioIcon className="size-3.5" />
              Live demo
            </div>
          </header>

          <div className="grid shrink-0 grid-cols-2 divide-x divide-border border-b border-border lg:grid-cols-4">
            {[
              ["On clock", "5"],
              ["Working", "4"],
              ["On break", "1"],
              ["Done today", "7"],
            ].map(([label, value]) => (
              <div key={label} className="px-5 py-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-2 text-3xl font-semibold leading-none tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_390px]">
            <section className="min-h-0 overflow-y-auto p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold">Employees on the clock</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Downtown Cafe</p>
                </div>
                <ActivityIcon className="size-4 text-primary" />
              </div>
              <div className="overflow-hidden rounded-xl ring-1 ring-border">
                {employees.map((employee) => (
                  <div key={employee.name} className="grid gap-3 border-b border-border bg-card px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className={`grid size-10 place-items-center rounded-full ${employee.color} text-sm font-bold text-white`}>
                        {initials(employee.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{employee.name}</p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">{employee.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{employee.status}</span>
                      <span className="min-w-16 text-right font-mono text-sm font-semibold tabular-nums">{employee.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="min-h-0 border-t border-border bg-muted/20 lg:border-l lg:border-t-0">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold">Station events</h2>
                <p className="mt-1 text-xs text-muted-foreground">Clock-ins, breaks, and clock-outs.</p>
              </div>
              <div className="space-y-1 p-4">
                {events.map(([name, label, time, Icon]) => (
                  <div key={`${name}-${label}`} className="flex items-center gap-3 rounded-lg px-2 py-2">
                    <div className="grid size-8 place-items-center rounded-full bg-zinc-700 text-xs font-bold">
                      {initials(name as string)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold">{name as string}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon className="size-3" />
                        {label as string}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-muted-foreground">{time as string}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
