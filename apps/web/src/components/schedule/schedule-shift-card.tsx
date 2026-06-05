import { EmployeeAvatar } from "@/components/employee-avatar";
import { formatCompactTimeRange } from "@/components/schedule/date-utils";
import { OPEN_SHIFT_STYLE, positionStyle } from "@/components/schedule/position-styles";
import { calculateShiftHours, warningLabel } from "@/lib/timeclock-adapter";
import type { Employee, Shift } from "@/lib/timeclock-types";
import { Badge } from "@timeclock/ui/components/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  compact?: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function ScheduleShiftCard({
  shift,
  employee,
  showAssignee = false,
  compact = false,
  onEdit,
  onDuplicate,
  onDelete,
}: ScheduleShiftCardProps) {
  const isOpen = !shift.employeeId;
  const style = isOpen ? OPEN_SHIFT_STYLE : positionStyle(shift.position);
  const warning =
    shift.warning && shift.warning !== "open-shift" ? warningLabel(shift.warning) : null;
  const hours = calculateShiftHours(shift);

  if (compact) {
    return (
      <article
        onClick={(event) => event.stopPropagation()}
        className={`group relative flex w-full overflow-hidden rounded-md border shadow-sm transition-shadow hover:shadow-md ${style.card}`}
      >
        <div className={`w-1 shrink-0 ${style.bar}`} aria-hidden />
        <div className="min-w-0 flex-1 px-2 py-1.5 pr-7">
          <p className={`whitespace-nowrap text-[11px] font-semibold leading-tight tabular-nums ${style.title}`}>
            {formatCompactTimeRange(shift.start, shift.end)}
          </p>
          <p className={`truncate text-[11px] leading-tight ${style.meta}`}>{shift.position}</p>
        </div>
        <ShiftActionsMenu onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} compact />
        {warning ? (
          <span
            className="absolute bottom-1 right-1 size-1.5 rounded-full bg-amber-500"
            title={warning}
          />
        ) : null}
      </article>
    );
  }

  return (
    <article
      onClick={(event) => event.stopPropagation()}
      className={`group relative flex w-full flex-col gap-1 overflow-hidden rounded-md border shadow-sm transition-shadow hover:shadow-md ${style.card}`}
    >
      <div className="flex min-w-0">
        <div className={`w-1 shrink-0 self-stretch ${style.bar}`} aria-hidden />
        <div className="min-w-0 flex-1 px-2.5 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className={`whitespace-nowrap text-[12px] font-bold leading-tight tabular-nums ${style.title}`}>
                {formatCompactTimeRange(shift.start, shift.end)}
              </p>
              <h3 className={`truncate text-[12px] font-medium leading-tight ${style.meta}`}>
                {shift.position}
              </h3>
            </div>
            <ShiftActionsMenu onEdit={onEdit} onDuplicate={onDuplicate} onDelete={onDelete} />
          </div>

          {showAssignee ? (
            <div className="mt-2 flex items-center gap-2">
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

          <div className="mt-1.5 flex flex-wrap items-center gap-1">
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

          <footer className={`mt-1.5 flex flex-wrap items-center gap-2 text-[11px] ${style.footer}`}>
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
        </div>
      </div>
    </article>
  );
}

function ShiftActionsMenu({
  onEdit,
  onDuplicate,
  onDelete,
  compact = false,
}: {
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  compact?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`absolute right-1 top-1 inline-flex shrink-0 items-center justify-center rounded-md text-foreground/60 opacity-0 transition-opacity hover:bg-background/20 hover:text-foreground group-hover:opacity-100 data-popup-open:opacity-100 ${
          compact ? "size-5" : "size-6"
        }`}
        aria-label="Shift actions"
      >
        <EllipsisVerticalIcon className={compact ? "size-3" : "size-3.5"} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon />
            Edit shift
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <CopyIcon />
            Duplicate
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2Icon />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
