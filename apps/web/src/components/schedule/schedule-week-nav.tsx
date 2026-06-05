import { formatWeekMonthLabel, formatWeekRange } from "@/components/schedule/date-utils";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import { Calendar } from "@timeclock/ui/components/calendar";
import { parseDate } from "@timeclock/ui/components/calendar";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TriangleAlertIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";

type ScheduleWeekNavProps = {
  weekStartDate: string;
  isCurrentWeek: boolean;
  warningCount: number;
  warningTitle?: string;
  calendarOpen: boolean;
  onCalendarOpenChange: (open: boolean) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onJumpToCurrentWeek: () => void;
  onPickWeek: (date: Date) => void;
};

export function ScheduleWeekNav({
  weekStartDate,
  isCurrentWeek,
  warningCount,
  warningTitle,
  calendarOpen,
  onCalendarOpenChange,
  onPreviousWeek,
  onNextWeek,
  onJumpToCurrentWeek,
  onPickWeek,
}: ScheduleWeekNavProps) {
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!calendarOpen) {
      return;
    }
    function handlePointerDown(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        onCalendarOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [calendarOpen, onCalendarOpenChange]);

  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {warningCount > 0 ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-200"
            title={warningTitle}
          >
            <TriangleAlertIcon className="size-3.5 shrink-0" />
            {warningCount} {warningCount === 1 ? "issue" : "issues"}
          </span>
        ) : (
          <span className="hidden sm:block" aria-hidden />
        )}

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous week"
            onClick={onPreviousWeek}
            className="shrink-0"
          >
            <ChevronLeftIcon />
          </Button>
          <div className="min-w-0 text-center">
            <p className="truncate text-base font-semibold tracking-tight text-foreground">
              {formatWeekMonthLabel(weekStartDate)}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {formatWeekRange(weekStartDate)}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next week"
            onClick={onNextWeek}
            className="shrink-0"
          >
            <ChevronRightIcon />
          </Button>
        </div>

        <div className="flex items-center justify-end gap-1.5 sm:min-w-[7rem]">
          {!isCurrentWeek ? (
            <Button type="button" variant="outline" size="sm" onClick={onJumpToCurrentWeek}>
              Today
            </Button>
          ) : null}
          <Badge tone="neutral" className="hidden h-7 rounded-lg px-2.5 sm:inline-flex">
            Week
          </Badge>
          <div className="relative" ref={calendarRef}>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              aria-label="Pick week"
              aria-expanded={calendarOpen}
              onClick={() => onCalendarOpenChange(!calendarOpen)}
            >
              <CalendarIcon />
            </Button>
            {calendarOpen ? (
              <div className="absolute right-0 top-full z-30 mt-2 animate-in fade-in-0 zoom-in-95 duration-150">
                <Calendar
                  selected={parseDate(weekStartDate)}
                  defaultMonth={parseDate(weekStartDate)}
                  onSelect={(date) => {
                    if (date) {
                      onPickWeek(date);
                      onCalendarOpenChange(false);
                    }
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
