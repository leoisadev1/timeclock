import { cn } from "@timeclock/ui/lib/utils";
import { CheckIcon, CopyIcon, EyeIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type EmployeePinCellProps = {
  pin: string;
  employeeName: string;
  revealAll?: boolean;
};

export function EmployeePinCell({ pin, employeeName, revealAll = false }: EmployeePinCellProps) {
  const [hovered, setHovered] = useState(false);
  const [copied, setCopied] = useState(false);
  const revealed = revealAll || hovered;

  async function copyPin() {
    try {
      await navigator.clipboard.writeText(pin);
      setCopied(true);
      toast.success(`Copied PIN for ${employeeName}`);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy PIN");
    }
  }

  return (
    <button
      type="button"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setCopied(false);
      }}
      onFocus={() => setHovered(true)}
      onBlur={() => {
        setHovered(false);
        setCopied(false);
      }}
      onClick={copyPin}
      title={revealed ? "Click to copy PIN" : "Hover to reveal · click to copy"}
      className={cn(
        "group/pin inline-flex min-w-[5.5rem] items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 font-mono text-sm tabular-nums transition-[background-color,border-color,box-shadow] duration-150",
        revealed
          ? "border-primary/30 bg-primary/10 text-foreground shadow-sm"
          : "border-border/60 bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/50",
      )}
    >
      <span aria-hidden>{revealed ? pin : "••••"}</span>
      <span className="sr-only">{revealed ? `PIN ${pin}` : "PIN hidden"}</span>
      {copied ? (
        <CheckIcon className="size-3.5 shrink-0 text-emerald-500" />
      ) : revealed ? (
        <CopyIcon className="size-3.5 shrink-0 opacity-60 transition-opacity group-hover/pin:opacity-100" />
      ) : (
        <EyeIcon className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/pin:opacity-60" />
      )}
    </button>
  );
}
