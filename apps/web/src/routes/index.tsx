import { AppLogo } from "@/components/app-logo";
import { api } from "@timeclock/backend/convex/_generated/api";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@timeclock/ui/components/card";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowRightIcon,
  Building2Icon,
  CheckCircle2Icon,
  MonitorIcon,
  UserRoundIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

const panelClass = "rounded-xl bg-card shadow-sm ring-1 ring-border text-sm text-foreground";

function HomeComponent() {
  const status = useQuery(api.demo.getStatus);
  const demoLogin = useQuery(api.demo.getDemoLogin);
  const bootstrapMutation = useMutation(api.demo.bootstrap);

  const isLoading = status === undefined;
  const isSeeded = status?.seeded === true;

  return (
    <div className="min-h-svh bg-background text-sm text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <AppLogo className="size-8" />
          <div className="min-w-0">
            <span className="text-sm font-semibold text-foreground">Timeclock</span>
          </div>
          <Badge tone="primary" className="ml-auto shrink-0">
            Demo app
          </Badge>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-6 py-10">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Run schedules and timecards in one place
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Build the weekly schedule, help employees clock in, and check actual hours for each
            restaurant location.
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-3">
          <EntryCard
            icon={Building2Icon}
            title="Manager dashboard"
            description="See today's attendance, build the schedule, manage employees, and review timecards."
            action="Open manager view"
            to="/dashboard"
            primary
          />
          <EntryCard
            icon={UserRoundIcon}
            title="Employee clock-in"
            description="Employees use a 4-digit PIN to view shifts, clock in, take breaks, and clock out."
            action="Open employee view"
            to="/employee"
          />
          <EntryCard
            icon={MonitorIcon}
            title="Clock-in station"
            description="A shared workplace screen for employees to enter their PIN and record time."
            action="Open station"
            to="/station"
          />
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <Card className={`${panelClass} gap-0 py-0`}>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 border-b border-border py-4">
              <CardTitle className="text-sm font-semibold">Sample company</CardTitle>
              {isLoading ? (
                <span className="text-xs text-muted-foreground">Checking setup...</span>
              ) : isSeeded ? (
                <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2Icon className="size-3.5" />
                  Ready to demo
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Needs setup
                </span>
              )}
            </CardHeader>

            <CardContent className="space-y-4 py-5">
              {!isLoading && !isSeeded && (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Create two restaurant locations with employees, a weekly schedule, and a few
                    timecards so the app has real-looking data.
                  </p>
                  <Button onClick={() => bootstrapMutation({})}>Create sample company</Button>
                </div>
              )}

              {isSeeded && demoLogin?.seeded && (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {demoLogin.manager && (
                      <CredentialCard
                        label="Manager login"
                        email={demoLogin.manager.email}
                        password={demoLogin.manager.password}
                      />
                    )}
                    {demoLogin.admin && (
                      <CredentialCard
                        label="Admin login"
                        email={demoLogin.admin.email}
                        password={demoLogin.admin.password}
                      />
                    )}
                  </div>

                  {demoLogin.employeePins.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Try these employee PINs
                      </p>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
                        {demoLogin.employeePins.map((emp) => (
                          <Link
                            key={emp.employeeId}
                            to="/employee"
                            className="motion-product group flex flex-col gap-0.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/30 hover:shadow-md"
                          >
                            <span className="truncate text-xs font-medium text-foreground">
                              {emp.name}
                            </span>
                            <span className="font-mono text-sm font-bold text-primary">
                              {emp.pin}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className={`${panelClass} gap-0 py-0`}>
            <CardHeader className="border-b border-border py-4">
              <CardTitle className="text-sm font-semibold">Simple walkthrough</CardTitle>
            </CardHeader>
            <CardContent className="py-5">
              <ol className="space-y-3">
                {[
                  "Create the sample company",
                  "Open the manager dashboard",
                  "Build and publish next week's schedule",
                  "Clock in as an employee with a PIN",
                  "Review today's attendance and timecard reports",
                ].map((text, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {i + 1}
                    </span>
                    {text}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
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
      className={`group flex flex-col gap-4 rounded-xl p-5 shadow-sm ring-1 transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        primary ? "bg-primary text-white ring-primary/40" : "bg-card text-foreground ring-border"
      }`}
    >
      <div
        className={`flex size-10 items-center justify-center rounded-lg ${primary ? "bg-white/20" : "bg-muted"}`}
      >
        <Icon
          className={`size-5 ${primary ? "text-white" : "text-muted-foreground"}`}
          strokeWidth={1.8}
        />
      </div>
      <div className="flex-1">
        <h2 className={`text-sm font-semibold ${primary ? "text-white" : "text-foreground"}`}>
          {title}
        </h2>
        <p
          className={`mt-1.5 text-sm leading-relaxed ${primary ? "text-white/80" : "text-muted-foreground"}`}
        >
          {description}
        </p>
      </div>
      <Link
        to={to}
        className={`motion-product motion-press inline-flex h-9 w-fit items-center gap-1.5 rounded-lg px-3 text-sm font-medium ${
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

function CredentialCard({
  label,
  email,
  password,
}: {
  label: string;
  email: string;
  password: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="space-y-1 font-mono text-xs">
        <div className="flex min-w-0 gap-2">
          <span className="w-14 shrink-0 text-muted-foreground">email</span>
          <span className="truncate font-medium text-foreground">{email}</span>
        </div>
        <div className="flex min-w-0 gap-2">
          <span className="w-14 shrink-0 text-muted-foreground">pass</span>
          <span className="font-medium text-foreground">{password}</span>
        </div>
      </div>
    </div>
  );
}
