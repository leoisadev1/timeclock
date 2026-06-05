import { getLocations } from "@/lib/timeclock-adapter";
import type { Location, LocationId } from "@/lib/timeclock-types";
import { api } from "@timeclock/backend/convex/_generated/api";
import type { Id } from "@timeclock/backend/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";

export type UnifiedLocation =
  | { id: Id<"locations">; name: string; isConvex: true }
  | { id: LocationId; name: string; isConvex: false };

export function locationsForSwitcher(
  unified: UnifiedLocation[],
  demoLocations: Location[],
): Location[] {
  if (!unified.some((location) => location.isConvex)) {
    return demoLocations;
  }
  return unified.map((location) => {
    const match = demoLocations.find((demo) => demo.name === location.name);
    if (match) {
      return { ...match, id: location.id };
    }
    const fallback = demoLocations[0];
    return {
      id: location.id,
      name: location.name,
      address: fallback?.address ?? "",
      timezone: fallback?.timezone ?? "America/New_York",
      weekStart: "Monday",
      graceMinutes: fallback?.graceMinutes ?? 5,
      noShowMinutes: fallback?.noShowMinutes ?? 15,
      operatingHours: fallback?.operatingHours ?? {},
      active: true,
    };
  });
}

export function usePortalLocations() {
  const demoStatus = useQuery(api.demo.getStatus);
  const convexDemoLocations = useQuery(
    api.locations.listDemoLocations,
    demoStatus?.seeded ? {} : "skip",
  );
  const authenticatedLocations = useQuery(api.locations.listForCurrentUser);
  const demoLocations = useMemo(() => getLocations(), []);

  const locations = useMemo((): UnifiedLocation[] => {
    if (demoStatus?.seeded && convexDemoLocations?.length) {
      return convexDemoLocations
        .filter((location): location is NonNullable<(typeof convexDemoLocations)[number]> =>
          location != null,
        )
        .map((location) => ({
          id: location.id,
          name: location.name,
          isConvex: true as const,
        }));
    }
    if (authenticatedLocations?.length) {
      return authenticatedLocations
        .filter((location): location is NonNullable<(typeof authenticatedLocations)[number]> =>
          location != null,
        )
        .map((location) => ({
          id: location.id,
          name: location.name,
          isConvex: true as const,
        }));
    }
    return demoLocations.map((location) => ({
      id: location.id,
      name: location.name,
      isConvex: false as const,
    }));
  }, [demoStatus?.seeded, convexDemoLocations, authenticatedLocations, demoLocations]);

  const switcherLocations = useMemo(
    () => locationsForSwitcher(locations, demoLocations),
    [locations, demoLocations],
  );

  const usesConvex = locations.some((location) => location.isConvex);

  const [locationId, setLocationId] = useState(
    () => locations[0]?.id ?? demoLocations[0]?.id ?? "loc-downtown",
  );

  useEffect(() => {
    if (locations.length > 0 && !locations.some((location) => location.id === locationId)) {
      setLocationId(locations[0]!.id);
    }
  }, [locations, locationId]);

  const selectedLocation = locations.find((location) => location.id === locationId);
  const hasConvex = selectedLocation?.isConvex ?? false;

  return {
    locations,
    switcherLocations,
    locationId,
    setLocationId,
    hasConvex,
    usesConvex,
    selectedLocation,
    demoLocationsReady: demoStatus !== undefined,
  };
}
