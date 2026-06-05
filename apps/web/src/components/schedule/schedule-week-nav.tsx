import { formatWeekRangeLong } from "@/components/schedule/date-utils";
import { Button } from "@timeclock/ui/components/button";
import { Calendar } from "@timeclock/ui/components/calendar";
import { parseDate } from "@timeclock/ui/components/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@timeclock/ui/components/dropdown-menu";
import { cn } from "@timeclock/ui/lib/utils";
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  FilterIcon,
  PlusIcon,
  SendIcon,
  TriangleAlertIcon,
  WrenchIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ScheduleWeekNavProps = {
  weekStartDate: string;
  isCurrentWeek: boolean;
  warningCount: number;
  filterCount?: number;
  publishCount?: number;
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

const toolbarBtn =
  "h-9 rounded-lg border-border bg-card text-foreground shadow-none hover:bg-muted hover:text-foreground";

export function ScheduleWeekNav({
  weekStartDate,
  isCurrentWeek,
  warningCount,
  filterCount = 0,
  publishCount = 0,
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
  const [toolsOpen, setToolsOpen] = useState(false);

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

  const activeFilters = filterCount + (warningCount > 0 ? 1 : 0);

  return (
    <div className="border-b border-border bg-muted/25 px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          type="button"
          variant="outline"
          onClick={onJumpToCurrentWeek}
          className={toolbarBtn}
          disabled={isCurrentWeek}
        >
          Today
        </Button>

        <div className="relative flex min-w-0 items-center" ref={calendarRef}>
          <button
            type="button"
            onClick={() => onCalendarOpenChange(!calendarOpen)}
            className="flex h-9 min-w-[11.5rem] max-w-[14rem] items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/50 sm:min-w-[13rem]"
            aria-expanded={calendarOpen}
            aria-label="Pick week"
          >
            <CalendarIcon className="size-4 shrink-0 text-primary" strokeWidth={1.8} />
            <span className="truncate">{formatWeekRangeLong(weekStartDate)}</span>
          </button>
          <div className="ml-1 flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Previous week"
              onClick={onPreviousWeek}
              className="text-primary hover:bg-primary/10 hover:text-primary"
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Next week"
              onClick={onNextWeek}
              className="text-primary hover:bg-primary/10 hover:text-primary"
            >
              <ChevronRightIcon />
            </Button>
          </div>
          {calendarOpen ? (
            <div className="absolute left-0 top-full z-30 mt-2 animate-in fade-in-0 zoom-in-95 duration-150">
              <Calendar
                selected={parseDate(weekStartDate)}
                defaultMonth={parseDate(weekStartDate)}
                className="shadow-lg"
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

        <DropdownMenu>
          <DropdownMenuTrigger className={cn(toolbarBtn, "inline-flex items-center gap-1.5 px-3")}>
            Week
            <ChevronDownIcon className="size-3.5 opacity-70" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-36">
            <DropdownMenuGroup>
              <DropdownMenuItem disabled>Week</DropdownMenuItem>
              <DropdownMenuItem disabled>Day</DropdownMenuItem>
              <DropdownMenuItem disabled>Month</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger className={cn(toolbarBtn, "inline-flex items-center gap-1.5 px-3")}>
              <FilterIcon className="size-3.5 opacity-70" />
              Filters ({activeFilters})
              <ChevronDownIcon className="size-3.5 opacity-70" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuLabel>Active filters</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {warningCount > 0 ? (
                  <DropdownMenuItem disabled className="gap-2">
                    <TriangleAlertIcon className="size-3.5 text-amber-400" />
                    {warningCount} shift {warningCount === 1 ? "warning" : "warnings"}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>No warnings</DropdownMenuItem>
                )}
                {filterCount > 0 ? (
                  <DropdownMenuItem disabled>{filterCount} position filters</DropdownMenuItem>
                ) : null}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu open={toolsOpen} onOpenChange={setToolsOpen}>
            <DropdownMenuTrigger className={cn(toolbarBtn, "inline-flex items-center gap-1.5 px-3")}>
              <WrenchIcon className="size-3.5 opacity-70" />
              Tools
              {toolsOpen ? (
                <ChevronUpIcon className="size-3.5 opacity-70" />
              ) : (
                <ChevronDownIcon className="size-3.5 opacity-70" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
              <DropdownMenuGroup>
                {onAddShift ? (
                  <DropdownMenuItem
                    onClick={() => {
                      onAddShift();
                      setToolsOpen(false);
                    }}
                  >
                    <PlusIcon />
                    Add shift
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={() => {
                    onCalendarOpenChange(true);
                    setToolsOpen(false);
                  }}
                >
                  <CalendarIcon />
                  Jump to week
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onJumpToCurrentWeek} disabled={isCurrentWeek}>
                  <CalendarIcon />
                  Go to today
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {onPublishSchedule ? (
            <Button
              type="button"
              onClick={onPublishSchedule}
              disabled={published}
              className={cn(
                "h-9 gap-1.5 rounded-lg shadow-none disabled:opacity-100",
                published
                  ? "bg-muted text-muted-foreground hover:bg-muted"
                  : "bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              <SendIcon className="size-3.5" />
              Publish ({published ? 0 : publishCount})
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
