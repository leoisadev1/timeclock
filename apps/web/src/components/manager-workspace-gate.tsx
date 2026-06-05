import { AppLogo } from "@/components/app-logo";
import { Button } from "@timeclock/ui/components/button";
import { cn } from "@timeclock/ui/lib/utils";
import { CheckCircle2Icon, Loader2Icon, TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";

export type WorkspaceGateMode =
  | "loading-session"
  | "loading-workspace"
  | "connecting"
  | "needs-seed"
  | "needs-connect"
  | "no-locations";

type ManagerWorkspaceGateProps = {
  mode: WorkspaceGateMode;
  companyName?: string | null;
  managerName?: string | null;
  pending?: boolean;
  onPrimary?: () => void;
  onSecondary?: () => void;
};

const COPY: Record<
  WorkspaceGateMode,
  { title: string; detail: string; primary?: string; secondary?: string }
> = {
  "loading-session": {
    title: "Signing you in",
    detail: "Confirming your Clerk session before opening the manager workspace.",
  },
  "loading-workspace": {
    title: "Loading workspace",
    detail: "Fetching your locations and manager permissions from Convex.",
  },
  connecting: {
    title: "Connecting your account",
    detail: "Linking this sign-in to the demo manager profile. This only takes a moment.",
  },
  "needs-seed": {
    title: "Set up your workspace",
    detail:
      "Create demo restaurants, employees, schedules, and timecards for this Clerk account in one step.",
    primary: "Create demo workspace",
  },
  "needs-connect": {
    title: "Connect manager access",
    detail:
      "Demo data is already in the database. Link your Clerk account to a manager profile — nothing gets wiped.",
    primary: "Connect my account",
    secondary: "Recreate demo data",
  },
  "no-locations": {
    title: "No locations assigned",
    detail:
      "Your account is linked, but this manager has no active locations. Reset demo data or ask an admin to assign a site.",
    primary: "Recreate demo data",
    secondary: "Back to home",
  },
};

export function ManagerWorkspaceGate({
  mode,
  companyName,
  managerName,
  pending = false,
  onPrimary,
  onSecondary,
}: ManagerWorkspaceGateProps) {
  const copy = COPY[mode];
  const isLoading = mode === "loading-session" || mode === "loading-workspace" || mode === "connecting";

  return (
    <div className="grid min-h-svh place-items-center bg-background px-6 py-10 text-foreground">
      <div className="motion-product w-full max-w-md animate-view-enter overflow-hidden rounded-2xl bg-card shadow-xl ring-1 ring-border">
        <div className="border-b border-border/80 bg-muted/15 px-6 py-5">
          <div className="flex items-center gap-3">
            <AppLogo className="size-9 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Manager workspace
              </p>
              <p className="truncate text-sm font-semibold text-foreground">
                {companyName ?? "Timeclock demo"}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="flex gap-3">
            <StatusIcon mode={mode} pending={pending} />
            <div className="min-w-0 space-y-1">
              <h1 className="text-base font-semibold tracking-tight">{copy.title}</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">{copy.detail}</p>
              {managerName ? (
                <p className="text-xs text-muted-foreground">
                  Signed in as <span className="font-medium text-foreground">{managerName}</span>
                </p>
              ) : null}
            </div>
          </div>

          {mode === "needs-connect" ? (
            <ul className="space-y-2 rounded-xl border border-border/70 bg-muted/15 px-3 py-3 text-xs text-muted-foreground">
              <Step done label="Demo data in Convex" />
              <Step label="Link this Clerk user to a manager" />
              <Step label="Open schedule & reports" />
            </ul>
          ) : null}

          {!isLoading && (copy.primary || copy.secondary) ? (
            <div className="flex flex-col gap-2">
              {copy.primary && onPrimary ? (
                <Button disabled={pending} onClick={onPrimary} className="motion-product w-full">
                  {pending ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      Working...
                    </>
                  ) : (
                    copy.primary
                  )}
                </Button>
              ) : null}
              {copy.secondary && onSecondary ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending}
                  onClick={onSecondary}
                  className="motion-product w-full text-muted-foreground"
                >
                  {copy.secondary}
                </Button>
              ) : null}
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
              <span>Please wait</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ mode, pending }: { mode: WorkspaceGateMode; pending: boolean }) {
  if (pending || mode === "connecting" || mode.startsWith("loading")) {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Loader2Icon className={cn("size-4", pending || mode !== "loading-session" ? "animate-spin" : "")} />
      </span>
    );
  }
  if (mode === "no-locations") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <TriangleAlertIcon className="size-4" />
      </span>
    );
  }
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
      <CheckCircle2Icon className="size-4" />
    </span>
  );
}

function Step({ label, done }: { label: string; done?: boolean }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
          done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
        aria-hidden
      >
        {done ? "✓" : "·"}
      </span>
      <span className={done ? "text-foreground" : undefined}>{label}</span>
    </li>
  );
}

export function ManagerWorkspaceGateShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-6 text-foreground">
      {children}
    </div>
  );
}
