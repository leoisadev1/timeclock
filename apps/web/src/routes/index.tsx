import { api } from "@timeclock/backend/convex/_generated/api";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRightIcon,
  Building2Icon,
  CheckCircle2Icon,
  Clock3Icon,
  MonitorIcon,
  UserRoundIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  const status = useQuery(api.demo.getStatus);
  const demoLogin = useQuery(api.demo.getDemoLogin);
  const bootstrapMutation = useMutation(api.demo.bootstrap);

  const isLoading = status === undefined;
  const isSeeded = status?.seeded === true;

  return (
    <div className="min-h-svh bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm px-6 py-3">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Clock3Icon className="size-4 text-primary-foreground" strokeWidth={2} />
          </div>
          <span className="text-sm font-semibold">Timeclock</span>
          <Badge tone="primary" className="ml-1">Hackathon MVP</Badge>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        {/* Hero */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Scheduling &amp; attendance
          </h1>
          <p className="mt-2 text-muted-foreground">
            Multi-location clock-in, live attendance, schedule builder, and timecard reports for hourly restaurant teams.
          </p>
        </div>

        {/* Three product areas */}
        <section className="grid gap-4 sm:grid-cols-3">
          <EntryCard
            icon={Building2Icon}
            title="Manager workspace"
            description="Today dashboard, schedule builder, employee roster, reports, and settings."
            action="Open dashboard"
            to="/dashboard"
            primary
          />
          <EntryCard
            icon={UserRoundIcon}
            title="Employee portal"
            description="Sign in with a 4-digit PIN, view your published shifts, punch in or out."
            action="Employee sign in"
            to="/employee"
          />
          <EntryCard
            icon={MonitorIcon}
            title="Station kiosk"
            description="Shared clock-in station — unlock, select location, enter PIN, punch."
            action="Launch station"
            to="/station"
          />
        </section>

        {/* Demo setup + walkthrough */}
        <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
          {/* Setup card */}
          <div className="rounded-xl bg-card shadow-sm ring-1 ring-foreground/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Demo setup</h2>
              {isLoading ? (
                <span className="text-xs text-muted-foreground">Connecting...</span>
              ) : isSeeded ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2Icon className="size-3.5" />
                  Database seeded
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Not seeded
                </span>
              )}
            </div>

            {!isLoading && !isSeeded && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Create a sample company with two locations, ten employees, this week's schedule, and today's timecards.
                </p>
                <Button onClick={() => bootstrapMutation({})}>
                  Bootstrap demo data
                </Button>
              </div>
            )}

            {isSeeded && demoLogin?.seeded && (
              <div className="space-y-5">
                {/* Credentials */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {demoLogin.manager && (
                    <CredentialCard label="Manager login" email={demoLogin.manager.email} password={demoLogin.manager.password} />
                  )}
                  {demoLogin.admin && (
                    <CredentialCard label="Admin login" email={demoLogin.admin.email} password={demoLogin.admin.password} />
                  )}
                </div>

                {/* Employee PINs */}
                {demoLogin.employeePins.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Employee PINs
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                      {demoLogin.employeePins.map((emp) => (
                        <Link
                          key={emp.employeeId}
                          to="/employee"
                          className="group flex flex-col gap-0.5 rounded-lg border bg-muted/30 px-3 py-2.5 transition-[background-color,border-color] duration-150 hover:border-primary/40 hover:bg-accent/30"
                        >
                          <span className="text-xs font-medium truncate">{emp.name}</span>
                          <span className="font-mono text-sm font-bold text-primary">{emp.pin}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Walkthrough card */}
          <div className="rounded-xl bg-card shadow-sm ring-1 ring-foreground/10 p-5 space-y-4">
            <h2 className="font-semibold">Demo walkthrough</h2>
            <ol className="space-y-3">
              {[
                "Bootstrap demo data above",
                "Open the manager dashboard",
                "Build and publish next week's schedule",
                "Employee clocks in via PIN portal or station",
                "Manager reviews Today dashboard and reports",
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {i + 1}
                  </span>
                  {text}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>
    </div>
  );
}

function EntryCard({
  icon: Icon,
  title,
  description,
  action,
  to,
  primary = false,
}: {
  icon: typeof Building2Icon;
  title: string;
  description: string;
  action: string;
  to: string;
  primary?: boolean;
}) {
  return (
    <div
      className={`group flex flex-col gap-4 rounded-xl p-5 shadow-sm ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        primary
          ? "bg-primary text-primary-foreground ring-primary/50"
          : "bg-card ring-foreground/10 hover:ring-primary/30"
      }`}
    >
      <div className={`flex size-10 items-center justify-center rounded-lg ${primary ? "bg-white/20" : "bg-muted"}`}>
        <Icon
          className={`size-5 ${primary ? "text-white" : "text-muted-foreground"}`}
          strokeWidth={1.8}
        />
      </div>
      <div className="flex-1">
        <h2 className={`font-semibold ${primary ? "text-white" : ""}`}>{title}</h2>
        <p className={`mt-1 text-sm leading-relaxed ${primary ? "text-white/70" : "text-muted-foreground"}`}>
          {description}
        </p>
      </div>
      <Link
        to={to}
        className={`inline-flex h-9 w-fit items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-[background-color,opacity,transform] duration-150 active:translate-y-px ${
          primary
            ? "bg-white text-primary hover:bg-white/90"
            : "bg-primary text-primary-foreground hover:bg-primary/90"
        }`}
      >
        {action}
        <ArrowRightIcon className="size-4" />
      </Link>
    </div>
  );
}

function CredentialCard({ label, email, password }: { label: string; email: string; password: string }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="font-mono text-xs space-y-1">
        <div className="flex gap-2 min-w-0">
          <span className="w-14 shrink-0 text-muted-foreground">email</span>
          <span className="font-medium truncate">{email}</span>
        </div>
        <div className="flex gap-2 min-w-0">
          <span className="w-14 shrink-0 text-muted-foreground">pass</span>
          <span className="font-medium">{password}</span>
        </div>
      </div>
    </div>
  );
}
