import { cn } from "@timeclock/ui/lib/utils";
import { TriangleAlertIcon } from "lucide-react";

type AlertsCornerIndicatorProps = {
  count: number;
  label?: string;
  className?: string;
};

export function AlertsCornerIndicator({ count, label, className }: AlertsCornerIndicatorProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <div
      className={cn("pointer-events-none fixed bottom-4 right-4 z-[100] flex items-end gap-1", className)}
      title={label ?? `${count} alert${count === 1 ? "" : "s"}`}
      role="status"
      aria-live="polite"
      aria-label={label ?? `${count} alerts`}
    >
      <TriangleAlertIcon
        className="size-5 shrink-0 fill-amber-400 text-amber-400"
        strokeWidth={1.75}
        aria-hidden
      />
      <span className="mb-0.5 min-w-[1rem] text-[11px] font-bold tabular-nums leading-none text-amber-400">
        {count}
      </span>
    </div>
  );
}
