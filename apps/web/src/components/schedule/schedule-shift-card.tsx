import { EmployeeAvatar } from "@/components/employee-avatar";
import { OPEN_SHIFT_STYLE, positionStyle } from "@/components/schedule/position-styles";
import { calculateShiftHours, warningLabel } from "@/lib/timeclock-adapter";
import type { Employee, Shift } from "@/lib/timeclock-types";
import { Badge } from "@timeclock/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@timeclock/ui/components/dropdown-menu";
import {
  ClockIcon,
  CopyIcon,
  EllipsisVerticalIcon,
  MoonIcon,
  PencilIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from "lucide-react";

type ScheduleShiftCardProps = {
  shift: Shift;
  employee?: Employee;
  showAssignee?: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function ScheduleShiftCard({
  shift,
  employee,
  showAssignee = false,
  onEdit,
  onDuplicate,
  onDelete,
}: ScheduleShiftCardProps) {
  const isOpen = !shift.employeeId;
  const style = isOpen ? OPEN_SHIFT_STYLE : positionStyle(shift.position);
  const warning =
    shift.warning && shift.warning !== "open-shift" ? warningLabel(shift.warning) : null;
  const hours = calculateShiftHours(shift);

  return (
    <article
      onClick={(event) => event.stopPropagation()}
      className={`group relative flex w-full flex-col gap-1 rounded-md border px-2.5 py-2 shadow-sm transition-[box-shadow,transform] duration-150 hover:shadow-md motion-press ${style.card}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`truncate text-sm font-bold leading-snug tabular-nums ${style.title}`}>
            {shift.start}–{shift.end}
          </p>
          <h3 className={`truncate text-sm font-medium leading-snug ${style.title}`}>{shift.position}</h3>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-background/60 hover:text-foreground group-hover:opacity-100 data-popup-open:opacity-100"
            aria-label="Shift actions"
          >
            <EllipsisVerticalIcon className="size-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <PencilIcon />
              Edit shift
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <CopyIcon />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {showAssignee ? (
        <div className="flex items-center gap-2">
          {employee ? (
            <>
              <EmployeeAvatar
                name={employee.name}
                initials={employee.initials}
                avatarColor={employee.avatarColor}
                avatarUrl={employee.avatarUrl}
                employeeId={employee.id}
                size="sm"
              />
              <span className={`truncate text-xs font-medium ${style.meta}`}>{employee.name}</span>
            </>
          ) : (
            <Badge tone="neutral">Unassigned</Badge>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-1">
        {isOpen ? <Badge tone="neutral">Open shift</Badge> : null}
        {shift.overnight ? (
          <Badge tone="warning" className="gap-1">
            <MoonIcon className="size-3" />
            Overnight
          </Badge>
        ) : null}
        {warning ? (
          <Badge tone="danger" className="gap-1">
            <TriangleAlertIcon className="size-3" />
            {warning}
          </Badge>
        ) : null}
      </div>

      <footer
        className={`flex flex-wrap items-center gap-2 text-[11px] dark:border-white/10 ${style.footer}`}
      >
        <span className="inline-flex items-center gap-1 tabular-nums">
          <ClockIcon className="size-3 opacity-70" />
          {hours.toFixed(1)}h
        </span>
        {shift.breakMinutes > 0 ? (
          <span className="tabular-nums">{shift.breakMinutes}m break</span>
        ) : null}
        {shift.notes ? (
          <span className="truncate opacity-80" title={shift.notes}>
            Note
          </span>
        ) : null}
      </footer>
    </article>
  );
}
