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
        onChange={(e) => onChange(e.target.value as LocationId)}
        className="h-8 w-full rounded-full border border-sidebar-border bg-transparent px-3 text-xs font-medium text-sidebar-foreground outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>{loc.name}</option>
        ))}
      </select>
    );
  }

  return (
    <label className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as LocationId)}
        className="h-10 rounded-full border border-input bg-background px-4 text-sm text-foreground outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
      >
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>{loc.name}</option>
        ))}
      </select>
    </label>
  );
}
