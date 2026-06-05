import type { Location, LocationId } from "@/lib/timeclock-types";
import { Label } from "@timeclock/ui/components/label";

interface LocationSwitcherProps {
  locations: Location[];
  value: LocationId;
  onChange: (locationId: LocationId) => void;
  label?: string;
  compact?: boolean;
}

const selectClass =
  "motion-product h-9 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

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
        className={selectClass}
        aria-label="Location"
      >
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
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
        className={selectClass}
      >
        {locations.map((loc) => (
          <option key={loc.id} value={loc.id}>
            {loc.name}
          </option>
        ))}
      </select>
    </label>
  );
}
