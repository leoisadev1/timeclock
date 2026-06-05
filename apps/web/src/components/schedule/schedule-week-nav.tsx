import { formatWeekMonthLabel, formatWeekRange } from "@/components/schedule/date-utils";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import { Calendar } from "@timeclock/ui/components/calendar";
import { parseDate } from "@timeclock/ui/components/calendar";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  PlusIcon,
  SendIcon,
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
  onAddShift?: () => void;
  onPublishSchedule?: () => void;
  published?: boolean;
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
  onAddShift,
  onPublishSchedule,
  published = false,
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
    <div className="border-b border-[#dedbd1] bg-[#f5f4ef] px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={onJumpToCurrentWeek}>
          Today
        </Button>

        <div className="flex min-w-0 items-center gap-2">
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
              {formatWeekRange(weekStartDate)}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {formatWeekMonthLabel(weekStartDate)}
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

        <Button type="button" variant="outline" className="min-w-24 justify-between">
          Week
          <ChevronRightIcon className="rotate-90" />
        </Button>

        {warningCount > 0 ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-2 text-xs font-medium text-amber-700 ring-1 ring-amber-500/20 dark:text-amber-200"
            title={warningTitle}
          >
            <TriangleAlertIcon className="size-3.5 shrink-0" />
            {warningCount}
          </span>
        ) : null}

        <div className="ml-auto flex items-center justify-end gap-2">
          <Button type="button" variant="outline">
            <FilterIcon />
            Filters
          </Button>
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
          {onAddShift ? (
            <Button type="button" variant="outline" onClick={onAddShift}>
              <PlusIcon />
              Add
            </Button>
          ) : null}
          {onPublishSchedule ? (
            <Button type="button" onClick={onPublishSchedule} disabled={published}>
              <SendIcon />
              {published ? "Published" : "Publish"}
            </Button>
          ) : null}
        </div>
      </div>
      {!isCurrentWeek ? null : <Badge tone="primary" className="mt-2">Current week</Badge>}
    </div>
  );
}
