import { cn } from "@timeclock/ui/lib/utils";
import * as React from "react";

type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  warning: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  danger: "border-destructive/25 bg-destructive/10 text-destructive",
  info: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  primary: "border-primary/25 bg-primary/10 text-primary",
};

function Badge({
  className,
  tone = "neutral",
  ...props
}: React.ComponentProps<"span"> & { tone?: BadgeTone }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-full border px-2 text-[11px] font-medium leading-none",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
