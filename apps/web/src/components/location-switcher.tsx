import { NewLocationDialog, type NewLocationInput } from "@/components/new-location-dialog";
import type { Location, LocationId } from "@/lib/timeclock-types";
import { cn } from "@timeclock/ui/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@timeclock/ui/components/dropdown-menu";
import { Label } from "@timeclock/ui/components/label";
import { ChevronsUpDownIcon, MapPinIcon, PlusIcon } from "lucide-react";
import { useState } from "react";

interface LocationSwitcherProps {
  locations: Location[];
  value: LocationId;
  onChange: (locationId: LocationId) => void;
  label?: string;
  compact?: boolean;
  allowCreate?: boolean;
  createPending?: boolean;
  onCreateLocation?: (input: NewLocationInput) => Promise<LocationId | void>;
}

export function LocationSwitcher({
  locations,
  value,
  onChange,
  label = "Location",
  compact = false,
  allowCreate = false,
  createPending = false,
  onCreateLocation,
}: LocationSwitcherProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const active = locations.find((loc) => loc.id === value) ?? locations[0];

  const triggerClass = cn(
    "motion-product flex h-10 w-full items-center gap-2 rounded-lg border px-3 text-left text-sm font-medium outline-none transition-[background-color,border-color,box-shadow] duration-150",
    "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
    compact
      ? "border-sidebar-border/80 bg-sidebar-accent/20 text-sidebar-foreground hover:bg-sidebar-accent/40"
      : "border-input bg-muted/20 text-foreground hover:bg-muted/40",
  );

  const menu = (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          nativeButton={false}
          className={triggerClass}
          aria-label="Switch location"
        >
          <MapPinIcon
            className={cn(
              "size-4 shrink-0",
              compact ? "text-primary" : "text-muted-foreground",
            )}
            strokeWidth={1.8}
          />
          <span className="min-w-0 flex-1 truncate">{active?.name ?? "Select location"}</span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" strokeWidth={1.8} />
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          sideOffset={6}
          className="min-w-[var(--anchor-width)] max-w-[min(100vw-2rem,320px)] p-1.5"
        >
          <DropdownMenuLabel className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Your locations
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={(next) => {
              if (next) {
                onChange(next as LocationId);
              }
            }}
          >
            {locations.map((loc) => (
              <DropdownMenuRadioItem key={loc.id} value={loc.id} className="py-2.5 text-sm">
                <span className="truncate font-medium">{loc.name}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          {allowCreate && onCreateLocation ? (
            <>
              <DropdownMenuSeparator className="my-1.5" />
              <DropdownMenuItem
                className="gap-2 py-2.5 text-sm font-medium text-primary focus:text-primary"
                onSelect={() => setCreateOpen(true)}
              >
                <PlusIcon className="size-4" strokeWidth={2} />
                New location
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      {allowCreate && onCreateLocation ? (
        <NewLocationDialog
          open={createOpen}
          pending={createPending}
          onClose={() => setCreateOpen(false)}
          onCreate={async (input) => {
            const newId = await onCreateLocation(input);
            setCreateOpen(false);
            if (newId) {
              onChange(newId);
            }
          }}
        />
      ) : null}
    </>
  );

  if (compact) {
    return <div className="w-full">{menu}</div>;
  }

  return (
    <div className="grid w-full gap-1.5">
      <Label className="text-xs">{label}</Label>
      {menu}
    </div>
  );
}
