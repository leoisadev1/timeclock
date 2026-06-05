import { Button } from "@timeclock/ui/components/button";
import { cn } from "@timeclock/ui/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const parts = value.split("-").map(Number);
  const y = parts[0] ?? 0;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(y, m - 1, d);
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export type CalendarProps = {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  defaultMonth?: Date;
  className?: string;
  weekStartsOn?: 0 | 1;
};

function Calendar({
  selected,
  onSelect,
  defaultMonth,
  className,
  weekStartsOn = 1,
}: CalendarProps) {
  const today = React.useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [visibleMonth, setVisibleMonth] = React.useState(() =>
    startOfMonth(defaultMonth ?? selected ?? today),
  );

  React.useEffect(() => {
    if (defaultMonth) {
      setVisibleMonth(startOfMonth(defaultMonth));
    }
  }, [defaultMonth]);

  const monthLabel = visibleMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const firstOfMonth = startOfMonth(visibleMonth);
  const leadingEmpty = (firstOfMonth.getDay() - weekStartsOn + 7) % 7;
  const totalDays = daysInMonth(visibleMonth);
  const cells: Array<{ date: Date; inMonth: boolean }> = [];

  for (let i = 0; i < leadingEmpty; i++) {
    const date = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), -leadingEmpty + i + 1);
    cells.push({ date, inMonth: false });
  }
  for (let day = 1; day <= totalDays; day++) {
    cells.push({
      date: new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day),
      inMonth: true,
    });
  }
  while (cells.length % 7 !== 0) {
    const lastCell = cells[cells.length - 1];
    if (!lastCell) {
      break;
    }
    const last = lastCell.date;
    const next = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
    cells.push({ date: next, inMonth: false });
  }

  const orderedWeekdays =
    weekStartsOn === 1
      ? [...WEEKDAY_LABELS.slice(1), WEEKDAY_LABELS[0]]
      : WEEKDAY_LABELS;

  return (
    <div
      data-slot="calendar"
      className={cn("w-[320px] rounded-xl bg-card p-4 shadow-sm ring-1 ring-border", className)}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Previous month"
          onClick={() =>
            setVisibleMonth(
              new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() - 1, 1),
            )
          }
        >
          <ChevronLeftIcon />
        </Button>
        <span className="w-[9.5rem] truncate text-center text-sm font-semibold">{monthLabel}</span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Next month"
          onClick={() =>
            setVisibleMonth(
              new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 1),
            )
          }
        >
          <ChevronRightIcon />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground">
        {orderedWeekdays.map((label) => (
          <span key={label} className="py-1">
            {label}
          </span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map(({ date, inMonth }) => {
          const selectedDay = selected && isSameDay(date, selected);
          const isToday = isSameDay(date, today);
          return (
            <button
              key={toDateString(date)}
              type="button"
              disabled={!inMonth}
              onClick={() => onSelect?.(date)}
              className={cn(
                "flex size-10 items-center justify-center rounded-lg text-sm transition-[background-color,color,opacity] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                !inMonth && "pointer-events-none opacity-30",
                inMonth && !selectedDay && "text-foreground hover:bg-muted",
                selectedDay && "bg-primary font-semibold text-primary-foreground",
                isToday && !selectedDay && "font-semibold text-primary",
              )}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { Calendar, parseDate, toDateString };
