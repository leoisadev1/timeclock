import type { Location, LocationId } from "@/lib/timeclock-types";
import { Label } from "@timeclock/ui/components/label";

interface LocationSwitcherProps {
  locations: Location[];
  value: LocationId;
  onChange: (locationId: LocationId) => void;
  label?: string;
  compact?: boolean;
}

export function LocationSwitcher({
  locations,
  value,
  onChange,
  label = "Location",
  compact = false,
}: LocationSwitcherProps) {
  if (compact) {
    return (
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as LocationId)}
        className="h-7 w-full rounded-md border border-sidebar-border bg-transparent px-2 text-xs text-sidebar-foreground outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
      >
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <label className="grid gap-1">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as LocationId)}
        className="h-9 min-w-52 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        {locations.map((location) => (
          <option key={location.id} value={location.id}>
            {location.name}
          </option>
        ))}
      </select>
    </label>
  );
}
