"use client";

import { AppLogo } from "@/components/app-logo";
import { Button } from "@timeclock/ui/components/button";
import { Input } from "@timeclock/ui/components/input";
import { Link } from "@tanstack/react-router";
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
  const [email, setEmail] = useState("");
  const [pendingMethod, setPendingMethod] = useState<"google" | "email" | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const disabled = !isLoaded || pendingMethod !== null;

  const handleGoogle = async () => {
    if (!isLoaded) return;
    setPendingMethod("google");
    setError(null);
    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/auth/sso-callback",
        redirectUrlComplete: redirectTo,
        continueSignIn: true,
        continueSignUp: true,
      });
    } catch (err) {
      setError(clerkErrorMessage(err));
      setPendingMethod(null);
    }
  };

  const handleEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoaded) return;

    const identifier = email.trim().toLowerCase();
    if (!identifier) {
      setError("Enter an email address.");
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
              : "Use one of the sign-in methods enabled for this workspace."}
          </p>

          <div className="mt-7 space-y-3">
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={handleGoogle}
              className="h-11 w-full justify-center gap-3 bg-background"
            >
              <GoogleIcon />
              {pendingMethod === "google" ? "Opening Google..." : "Continue with Google"}
            </Button>

            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form className="space-y-3" onSubmit={handleEmail}>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                autoComplete="email"
                disabled={disabled}
                required
                className="h-11"
              />
              <Button type="submit" disabled={disabled} className="h-11 w-full justify-center">
                {pendingMethod === "email" ? "Sending link..." : "Email me a sign-in link"}
              </Button>
            </form>
          </div>

          <div className="mt-5 space-y-2 text-sm">
            {notice ? <p className="text-emerald-700 dark:text-emerald-400">{notice}</p> : null}
            {error ? <p className="text-destructive">{error}</p> : null}
          </div>

          <div className="mt-7 border-t border-border pt-5">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Available here</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="border border-border bg-muted px-2.5 py-1">Google OAuth</span>
              <span className="border border-border bg-muted px-2.5 py-1">Email magic link</span>
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
            Sign in first. If your account has no manager data yet, the dashboard will seed a fresh workspace for your Clerk user.
          </p>
          <Link to="/" className="mt-7 inline-flex text-sm font-medium text-foreground underline-offset-4 hover:underline">
            Back to Timeclock
          </Link>
        </motion.aside>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default Auth3;
