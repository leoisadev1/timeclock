import type { Employee } from "@/lib/timeclock-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@timeclock/ui/components/dropdown-menu";
import { CopyIcon, EllipsisIcon, PencilIcon, UserMinusIcon } from "lucide-react";
import { toast } from "sonner";

type EmployeeActionsMenuProps = {
  employee: Employee;
  onEdit: () => void;
  onDeactivate: () => void | Promise<void>;
};

export function EmployeeActionsMenu({ employee, onEdit, onDeactivate }: EmployeeActionsMenuProps) {
  async function copyPin() {
    try {
      await navigator.clipboard.writeText(employee.pin);
      toast.success(`Copied ${employee.name}'s PIN`);
    } catch {
      toast.error("Could not copy PIN");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground transition-[background-color,border-color,color] duration-150 hover:border-border hover:bg-muted/60 hover:text-foreground data-popup-open:border-border data-popup-open:bg-muted/60 data-popup-open:text-foreground"
        aria-label={`Actions for ${employee.name}`}
      >
        <EllipsisIcon className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-semibold text-foreground">{employee.name}</p>
          <p className="truncate text-[11px] text-muted-foreground">{employee.position}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onEdit}>
            <PencilIcon />
            Edit employee
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyPin}>
            <CopyIcon />
            Copy PIN
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" disabled={!employee.active} onClick={onDeactivate}>
            <UserMinusIcon />
            Deactivate employee
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
