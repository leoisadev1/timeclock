"use client";

import { AppLogo } from "@/components/app-logo";
import { Button } from "@timeclock/ui/components/button";
import { Input } from "@timeclock/ui/components/input";
import { Link } from "@tanstack/react-router";
import { env } from "@timeclock/env/web";
import { useSignIn } from "@clerk/tanstack-react-start/legacy";
import { motion } from "motion/react";
import { useState } from "react";

type Auth3Props = {
  redirectTo?: string;
  reason?: "dashboard";
};

function clerkErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray((error as { errors?: unknown[] }).errors)
  ) {
    const [first] = (error as { errors: Array<{ longMessage?: string; message?: string }> }).errors;
    return first?.longMessage ?? first?.message ?? "Sign-in failed.";
  }
  return error instanceof Error ? error.message : "Sign-in failed.";
}

export function Auth3({ redirectTo = "/dashboard", reason }: Auth3Props) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState(env.VITE_DEMO_ALLOWED_EMAIL ?? "");
  const [pendingMethod, setPendingMethod] = useState<"email" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const allowedEmail = env.VITE_DEMO_ALLOWED_EMAIL?.trim().toLowerCase() ?? null;

  const disabled = !isLoaded || pendingMethod !== null;

  const handleEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded) return;

    const identifier = email.trim().toLowerCase();
    if (!identifier) {
      setError("Enter an email address.");
      return;
    }
    if (allowedEmail && identifier !== allowedEmail) {
      setError(`Sign-in is locked to ${allowedEmail}.`);
      return;
    }

    setPendingMethod("email");
    setNotice(null);
    setError(null);

    try {
      const result = await signIn.create({
        identifier,
        strategy: "email_link",
        redirectUrl: `${window.location.origin}${redirectTo}`,
        signUpIfMissing: true,
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        window.location.assign(redirectTo);
        return;
      }

      setNotice("Check your email for the sign-in link.");
    } catch (err) {
      setError(clerkErrorMessage(err));
    } finally {
      setPendingMethod(null);
    }
  };

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden bg-background p-6 text-foreground">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,oklch(0.98_0.01_70),oklch(0.92_0.04_40),oklch(0.96_0.01_250))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_15%,rgba(255,255,255,0.92),transparent_32%),radial-gradient(circle_at_78%_80%,rgba(255,255,255,0.72),transparent_30%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background/80 to-transparent" />

      <div className="relative z-10 mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-[minmax(0,420px)_1fr]">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          className="w-full border border-border bg-card p-6 shadow-xl sm:p-8"
        >
          <div className="mb-8 flex items-center gap-3">
            <AppLogo className="size-9" />
            <div>
              <p className="text-sm font-semibold">Timeclock</p>
              <p className="text-xs text-muted-foreground">Manager access</p>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {reason === "dashboard"
              ? "You need to log in to access the dashboard."
              : "This is a demo workspace. Use the one allowed email below."}
          </p>

          <form className="mt-7 space-y-3" onSubmit={handleEmail}>
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={allowedEmail || "Email address"}
              autoComplete="email"
              disabled={disabled}
              required
              className="h-11"
            />
            <Button type="submit" disabled={disabled} className="h-11 w-full justify-center">
              {pendingMethod === "email" ? "Sending link..." : "Email me a sign-in link"}
            </Button>
          </form>

          <div className="mt-5 space-y-2 text-sm">
            {notice ? <p className="text-emerald-700 dark:text-emerald-400">{notice}</p> : null}
            {error ? <p className="text-destructive">{error}</p> : null}
          </div>

          <div className="mt-7 border-t border-border pt-5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Available here</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="border border-border bg-muted px-2.5 py-1">Email magic link</span>
              {allowedEmail ? (
                <span className="max-w-full overflow-hidden text-ellipsis border border-border bg-muted px-2.5 py-1">
                  Demo only: {allowedEmail}
                </span>
              ) : null}
            </div>
          </div>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.36, delay: 0.06, ease: "easeOut" }}
          className="hidden lg:block"
        >
          <p className="text-sm font-medium text-muted-foreground">Private manager workspace</p>
          <h2 className="mt-3 max-w-xl text-5xl font-bold leading-[1.02] tracking-tight">
            Schedules, punches, reports, and staff settings behind one clean login.
          </h2>
          <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground">
            Sign in first. If your account has no manager data yet, the dashboard will seed a fresh
            workspace for your Clerk user.
          </p>
          <Link
            to="/"
            className="mt-7 inline-flex text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Back to Timeclock
          </Link>
        </motion.aside>
      </div>
    </div>
  );
}

export default Auth3;
