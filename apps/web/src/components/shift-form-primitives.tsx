import { calculateShiftHours } from "@/lib/timeclock-adapter";
import type { Employee, Shift } from "@/lib/timeclock-types";
import { cn } from "@timeclock/ui/lib/utils";
import { Label } from "@timeclock/ui/components/label";
import type { ReactNode, SelectHTMLAttributes } from "react";

const selectClass =
  "motion-product h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

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
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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
      <Label htmlFor={htmlFor} className="text-xs font-medium text-foreground/90">
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
    <select className={cn(selectClass, className)} {...props}>
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
      className="motion-product flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1"
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
              "motion-product min-w-[2.5rem] flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97]",
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
            )}
          >
            {day}
          </button>
        );
      })}
    </div>
  );
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

  return (
    <div
      className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-3 text-xs"
      aria-live="polite"
    >
      <span className="rounded-md bg-background/80 px-2 py-0.5 font-semibold text-foreground ring-1 ring-border/60">
        {hours.toFixed(1)}h
      </span>
      <span className="font-medium text-foreground">
        {draft.day} · {draft.start} – {draft.end}
      </span>
      <span className="text-muted-foreground" aria-hidden>
        ·
      </span>
      <span className="text-muted-foreground">{employeeName}</span>
      <span className="text-muted-foreground" aria-hidden>
        ·
      </span>
      <span className="text-muted-foreground">{draft.position}</span>
      {draft.breakMinutes > 0 ? (
        <>
          <span className="text-muted-foreground" aria-hidden>
            ·
          </span>
          <span className="text-muted-foreground">{draft.breakMinutes}m break</span>
        </>
      ) : null}
      {draft.overnight ? (
        <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          Overnight
        </span>
      ) : null}
    </div>
  );
}