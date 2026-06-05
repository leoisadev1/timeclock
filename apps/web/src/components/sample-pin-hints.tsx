import { employees as demoEmployees } from "@/lib/demo-data";
import type { LocationId } from "@/lib/timeclock-types";
import { api } from "@timeclock/backend/convex/_generated/api";
import type { Id } from "@timeclock/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useMemo } from "react";

type SamplePin = {
  id: string;
  name: string;
  pin: string;
  avatarUrl?: string | null;
};

function SamplePinChip({
  sample,
  onSelect,
}: {
  sample: SamplePin;
  onSelect: (pin: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(sample.pin)}
      className="flex items-center gap-1.5 rounded-xl bg-card px-2.5 py-1.5 text-xs font-medium ring-1 ring-border transition-colors duration-150 hover:bg-muted/50 active:scale-[0.98]"
    >
      {sample.avatarUrl ? (
        <img
          src={sample.avatarUrl}
          alt={sample.name}
          className="size-4 rounded-full object-cover"
        />
      ) : null}
      <span>{sample.name}</span>
      <span className="font-mono text-muted-foreground">{sample.pin}</span>
    </button>
  );
}

export function SamplePinHints({
  onSelect,
  enabled,
  convexLocationId,
  demoLocationId,
  limit = 4,
}: {
  onSelect: (pin: string) => void;
  enabled: boolean;
  convexLocationId?: Id<"locations">;
  demoLocationId?: LocationId;
  limit?: number;
}) {
  const demoLogin = useQuery(
    api.demo.getDemoLogin,
    enabled && convexLocationId ? { locationId: convexLocationId } : "skip",
  );

  const staticSamples = useMemo((): SamplePin[] => {
    if (!enabled || convexLocationId || !demoLocationId) {
      return [];
    }
    return demoEmployees
      .filter((employee) => employee.active && employee.assignedLocationIds.includes(demoLocationId))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, limit)
      .map((employee) => ({
        id: employee.id,
        name: employee.name,
        pin: employee.pin,
      }));
  }, [enabled, convexLocationId, demoLocationId, limit]);

  const convexSamples = useMemo((): SamplePin[] => {
    if (!enabled || !demoLogin?.employeePins?.length) {
      return [];
    }
    return demoLogin.employeePins.slice(0, limit).map((employee) => ({
      id: employee.employeeId,
      name: employee.name,
      pin: employee.pin,
      avatarUrl: employee.avatarUrl,
    }));
  }, [enabled, demoLogin, limit]);

  const samples = convexLocationId || demoLogin?.seeded ? convexSamples : staticSamples;

  if (!enabled || samples.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-1.5">
      <p className="text-xs text-muted-foreground">Try a sample PIN:</p>
      <div className="flex flex-wrap gap-1">
        {samples.map((sample) => (
          <SamplePinChip key={sample.id} sample={sample} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
