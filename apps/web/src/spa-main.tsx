import "./index.css";

import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ActivityIcon,
  BarChart3Icon,
  CalendarDaysIcon,
  CheckIcon,
  Clock3Icon,
  CoffeeIcon,
  LogInIcon,
  LogOutIcon,
  MonitorIcon,
  RadioIcon,
  TimerIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";

type View = "activity" | "schedule" | "employees" | "station" | "reports";
type Employee = {
  name: string;
  role: string;
  status: "Working" | "On break" | "Done" | "Off";
  time: string;
  color: string;
  pin: string;
};

const initialEmployees: Employee[] = [
  { name: "Avery Morgan", role: "Manager", status: "Working", time: "4:12", color: "bg-emerald-500", pin: "1001" },
  { name: "Maya Chen", role: "Barista", status: "Working", time: "3:44", color: "bg-blue-500", pin: "1002" },
  { name: "Jordan Lee", role: "Shift Lead", status: "On break", time: "2:18", color: "bg-amber-500", pin: "1003" },
  { name: "Sam Rivera", role: "Cashier", status: "Working", time: "1:56", color: "bg-violet-500", pin: "1004" },
  { name: "Nina Patel", role: "Cook", status: "Working", time: "1:21", color: "bg-rose-500", pin: "1005" },
  { name: "Riley Brooks", role: "Server", status: "Done", time: "5:06", color: "bg-teal-500", pin: "1006" },
];

const shifts = [
  ["Mon", "Avery", "6:00 AM - 2:00 PM", "Manager"],
  ["Mon", "Maya", "7:00 AM - 3:00 PM", "Barista"],
  ["Tue", "Jordan", "8:00 AM - 4:00 PM", "Shift Lead"],
  ["Wed", "Sam", "11:00 AM - 7:00 PM", "Cashier"],
  ["Thu", "Nina", "10:00 AM - 6:00 PM", "Cook"],
  ["Fri", "Riley", "12:00 PM - 8:00 PM", "Server"],
];

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);
}

function App() {
  const [view, setView] = useState<View>("activity");
  const [employees, setEmployees] = useState(initialEmployees);
  const [events, setEvents] = useState([
    ["Maya Chen", "Clocked in", "9:02 AM", "in"],
    ["Jordan Lee", "Started break", "10:41 AM", "break"],
    ["Avery Morgan", "Clocked in", "8:31 AM", "in"],
    ["Sam Rivera", "Clocked in", "11:05 AM", "in"],
    ["Riley Brooks", "Clocked out", "1:18 PM", "out"],
  ]);
  const counts = useMemo(() => {
    const onClock = employees.filter((employee) => employee.status === "Working" || employee.status === "On break");
    return {
      onClock: onClock.length,
      working: employees.filter((employee) => employee.status === "Working").length,
      break: employees.filter((employee) => employee.status === "On break").length,
      done: employees.filter((employee) => employee.status === "Done").length,
    };
  }, [employees]);

  function punch(name: string, action: "Clocked in" | "Started break" | "Ended break" | "Clocked out") {
    setEmployees((current) =>
      current.map((employee) => {
        if (employee.name !== name) return employee;
        if (action === "Clocked in" || action === "Ended break") return { ...employee, status: "Working" };
        if (action === "Started break") return { ...employee, status: "On break" };
        return { ...employee, status: "Done", time: "5:12" };
      }),
    );
    setEvents((current) => [[name, action, new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), action], ...current].slice(0, 8));
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background text-foreground">
      <aside className="hidden w-[220px] shrink-0 flex-col bg-sidebar lg:flex">
        <Brand />
        <Nav view={view} setView={setView} />
      </aside>
      <main className="flex min-w-0 flex-1 flex-col bg-muted/30">
        <header className="flex h-14 shrink-0 items-center justify-between bg-sidebar px-4 lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Clock3Icon className="size-5" />
            </div>
            <span className="text-lg font-bold tracking-tight">Timeclock</span>
          </div>
        </header>
        <nav className="flex shrink-0 gap-1 overflow-x-auto bg-sidebar px-3 py-2 lg:hidden">
          <MobileNav view={view} setView={setView} />
        </nav>
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 lg:p-4">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
            <Header view={view} />
            {view === "activity" ? <Activity employees={employees} events={events} counts={counts} /> : null}
            {view === "schedule" ? <Schedule /> : null}
            {view === "employees" ? <Employees employees={employees} /> : null}
            {view === "station" ? <Station employees={employees} punch={punch} /> : null}
            {view === "reports" ? <Reports counts={counts} /> : null}
          </div>
        </section>
      </main>
    </div>
  );
}

function Brand() {
  return (
    <div className="border-b border-sidebar-border/60 px-4 py-4">
      <div className="flex items-center gap-3">
        <div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Clock3Icon className="size-5" />
        </div>
        <div>
          <p className="text-sm font-bold">Timeclock</p>
          <p className="text-xs text-sidebar-foreground/50">No-auth demo</p>
        </div>
      </div>
    </div>
  );
}

const navItems: Array<[View, string, typeof ActivityIcon]> = [
  ["activity", "Activity", RadioIcon],
  ["station", "Clock-in station", MonitorIcon],
  ["schedule", "Schedule", CalendarDaysIcon],
  ["employees", "Employees", UsersIcon],
  ["reports", "Reports", BarChart3Icon],
];

function Nav({ view, setView }: { view: View; setView: (view: View) => void }) {
  return (
    <nav className="flex-1 space-y-1 px-2 py-3">
      {navItems.map(([id, label, Icon]) => (
        <button
          key={id}
          type="button"
          onClick={() => setView(id)}
          className={[
            "flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium",
            view === id ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-foreground/55 hover:bg-sidebar-accent/50",
          ].join(" ")}
        >
          <Icon className="size-4" />
          {label}
        </button>
      ))}
    </nav>
  );
}

function MobileNav({ view, setView }: { view: View; setView: (view: View) => void }) {
  return navItems.map(([id, label, Icon]) => (
    <button
      key={id}
      type="button"
      onClick={() => setView(id)}
      className={[
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
        view === id ? "bg-primary text-primary-foreground" : "text-sidebar-foreground/60",
      ].join(" ")}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  ));
}

function Header({ view }: { view: View }) {
  const title =
    view === "activity" ? "Coastal Cafe Group activity" : view === "station" ? "Clock-in station" : view === "schedule" ? "Schedule" : view === "employees" ? "Employees" : "Reports";
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border px-5 py-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-xs text-muted-foreground">No auth. Local demo mode. Ready for two MacBooks.</p>
      </div>
      <div className="hidden items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary sm:flex">
        <RadioIcon className="size-3.5" />
        Live demo
      </div>
    </header>
  );
}

function Metrics({ counts }: { counts: { onClock: number; working: number; break: number; done: number } }) {
  return (
    <div className="grid shrink-0 grid-cols-2 divide-x divide-border border-b border-border lg:grid-cols-4">
      {[
        ["On clock", counts.onClock],
        ["Working", counts.working],
        ["On break", counts.break],
        ["Done today", counts.done],
      ].map(([label, value]) => (
        <div key={label} className="px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold leading-none tabular-nums">{value}</p>
        </div>
      ))}
    </div>
  );
}

function Activity({ employees, events, counts }: { employees: Employee[]; events: string[][]; counts: { onClock: number; working: number; break: number; done: number } }) {
  return (
    <>
      <Metrics counts={counts} />
      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_390px]">
        <section className="min-h-0 overflow-y-auto p-5">
          <SectionTitle title="Employees on the clock" subtitle="Downtown Cafe" icon={ActivityIcon} />
          <EmployeeList employees={employees.filter((employee) => employee.status !== "Off")} />
        </section>
        <Events events={events} />
      </div>
    </>
  );
}

function EmployeeList({ employees }: { employees: Employee[] }) {
  return (
    <div className="overflow-hidden rounded-xl ring-1 ring-border">
      {employees.map((employee) => (
        <div key={employee.name} className="grid gap-3 border-b border-border bg-card px-4 py-3 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar employee={employee} />
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
  );
}

function Events({ events }: { events: string[][] }) {
  return (
    <section className="min-h-0 border-t border-border bg-muted/20 lg:border-l lg:border-t-0">
      <div className="border-b border-border px-5 py-4">
        <h2 className="text-sm font-semibold">Station events</h2>
        <p className="mt-1 text-xs text-muted-foreground">Clock-ins, breaks, and clock-outs.</p>
      </div>
      <div className="space-y-1 p-4">
        {events.map(([name, label, time], index) => (
          <div key={`${name}-${label}-${index}`} className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="grid size-8 place-items-center rounded-full bg-zinc-700 text-xs font-bold">{initials(name)}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{name}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                <TimerIcon className="size-3" />
                {label}
              </p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">{time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Station({ employees, punch }: { employees: Employee[]; punch: (name: string, action: "Clocked in" | "Started break" | "Ended break" | "Clocked out") => void }) {
  const [pin, setPin] = useState("1002");
  const employee = employees.find((entry) => entry.pin === pin) ?? employees[1];
  return (
    <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto p-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <section className="rounded-xl bg-muted/20 p-4 ring-1 ring-border">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sample PIN</p>
        <input
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          className="mt-3 h-12 w-full rounded-lg border border-input bg-background px-4 font-mono text-lg outline-none ring-ring focus:ring-2"
        />
        <div className="mt-3 grid grid-cols-3 gap-2">
          {["1001", "1002", "1003", "1004", "1005", "1006"].map((value) => (
            <button key={value} type="button" onClick={() => setPin(value)} className="rounded-lg bg-card px-3 py-2 font-mono text-sm ring-1 ring-border">
              {value}
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-xl bg-muted/20 p-5 ring-1 ring-border">
        <div className="flex items-center gap-3">
          <Avatar employee={employee} />
          <div>
            <h2 className="text-base font-semibold">{employee.name}</h2>
            <p className="text-sm text-muted-foreground">{employee.role} · {employee.status}</p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <PunchButton label="Clock in" icon={LogInIcon} onClick={() => punch(employee.name, "Clocked in")} />
          <PunchButton label="Start break" icon={CoffeeIcon} onClick={() => punch(employee.name, "Started break")} />
          <PunchButton label="End break" icon={CheckIcon} onClick={() => punch(employee.name, "Ended break")} />
          <PunchButton label="Clock out" icon={LogOutIcon} onClick={() => punch(employee.name, "Clocked out")} />
        </div>
      </section>
    </div>
  );
}

function Schedule() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <SectionTitle title="Week of Jun 8" subtitle="Draft schedule for Downtown Cafe" icon={CalendarDaysIcon} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {shifts.map(([day, name, time, role]) => (
          <div key={`${day}-${name}`} className="rounded-xl bg-muted/20 p-4 ring-1 ring-border">
            <p className="text-xs font-semibold text-primary">{day}</p>
            <h3 className="mt-3 text-sm font-semibold">{name}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{role}</p>
            <p className="mt-4 font-mono text-sm">{time}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Employees({ employees }: { employees: Employee[] }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <SectionTitle title="Team roster" subtitle="Demo employees and sample PINs" icon={UsersIcon} />
      <EmployeeList employees={employees} />
    </div>
  );
}

function Reports({ counts }: { counts: { onClock: number; working: number; break: number; done: number } }) {
  return (
    <>
      <Metrics counts={counts} />
      <div className="grid gap-4 p-5 md:grid-cols-3">
        {[
          ["Labor hours", "184.5", "+12%"],
          ["Late punches", "3", "Needs review"],
          ["Coverage", "96%", "Healthy"],
        ].map(([label, value, note]) => (
          <div key={label} className="rounded-xl bg-muted/20 p-5 ring-1 ring-border">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-4 text-3xl font-semibold">{value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{note}</p>
          </div>
        ))}
      </div>
    </>
  );
}

function SectionTitle({ title, subtitle, icon: Icon }: { title: string; subtitle: string; icon: typeof ActivityIcon }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Icon className="size-4 text-primary" />
    </div>
  );
}

function Avatar({ employee }: { employee: Employee }) {
  return (
    <div className={`grid size-10 place-items-center rounded-full ${employee.color} text-sm font-bold text-white`}>
      {initials(employee.name)}
    </div>
  );
}

function PunchButton({ label, icon: Icon, onClick }: { label: string; icon: typeof ActivityIcon; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
    >
      <Icon className="size-4" />
      {label}
    </button>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
