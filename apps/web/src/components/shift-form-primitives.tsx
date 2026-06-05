import { positionStyle } from "@/components/schedule/position-styles";
import { calculateShiftHours } from "@/lib/timeclock-adapter";
import type { Employee, Shift } from "@/lib/timeclock-types";
import { Label } from "@timeclock/ui/components/label";
import { cn } from "@timeclock/ui/lib/utils";
import type { ReactNode, SelectHTMLAttributes } from "react";

export const shiftControlClass =
  "motion-product h-10 w-full rounded-lg border border-input bg-muted/20 px-3 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

export function ShiftFormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

export function ShiftField({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function ShiftSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(shiftControlClass, className)} {...props}>
      {children}
    </select>
  );
}

export function DayPicker({
  days,
  value,
  onChange,
}: {
  days: string[];
  value: string;
  onChange: (day: string) => void;
}) {
  return (
    <div
      className="grid grid-cols-7 gap-1 rounded-xl border border-border/80 bg-muted/25 p-1"
      role="group"
      aria-label="Day of week"
    >
      {days.map((day) => {
        const selected = value === day;
        return (
          <button
            key={day}
            type="button"
            onClick={() => onChange(day)}
            aria-pressed={selected}
            className={cn(
              "motion-product rounded-lg py-2 text-center text-xs font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98]",
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/60 hover:text-foreground",
            )}
          >
            {day}
          </button>
        );
      })}
    </div>
  );
}

function SummaryMeta({ children }: { children: ReactNode }) {
  return <span className="text-muted-foreground">{children}</span>;
}

export function ShiftSummaryStrip({
  draft,
  employees,
}: {
  draft: Shift;
  employees: Employee[];
}) {
  const hours = calculateShiftHours(draft);
  const employeeName = draft.employeeId
    ? employees.find((employee) => employee.id === draft.employeeId)?.name
    : "Open shift";
  const positionColors = positionStyle(draft.position);

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-sm"
      aria-live="polite"
    >
      <span className="inline-flex items-center gap-1.5 rounded-md bg-background/70 px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground ring-1 ring-border/60">
        <span className={cn("size-1.5 shrink-0 rounded-full", positionColors.dot)} />
        {hours.toFixed(1)}h
      </span>
      <span className="hidden h-3.5 w-px bg-border sm:block" aria-hidden />
      <span className="font-medium text-foreground">
        {draft.day}
        <SummaryMeta> · </SummaryMeta>
        <span className="tabular-nums">
          {draft.start} – {draft.end}
        </span>
      </span>
      <span className="hidden h-3.5 w-px bg-border sm:block" aria-hidden />
      <span className="text-muted-foreground">{employeeName}</span>
      <span className="hidden h-3.5 w-px bg-border sm:block" aria-hidden />
      <span className="text-muted-foreground">{draft.position}</span>
      {draft.breakMinutes > 0 ? (
        <>
          <span className="hidden h-3.5 w-px bg-border sm:block" aria-hidden />
          <span className="text-muted-foreground tabular-nums">{draft.breakMinutes}m break</span>
        </>
      ) : null}
      {draft.overnight ? (
        <span className="rounded-md bg-primary/12 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          Overnight
        </span>
      ) : null}
    </div>
  );
}

export function ShiftFormPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border border-border/70 bg-muted/15 p-3.5 ring-1 ring-border/40",
        className,
      )}
    >
      {children}
    </div>
  );
}
