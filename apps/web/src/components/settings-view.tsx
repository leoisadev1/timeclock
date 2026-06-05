import { PositionsSettingsSection } from "@/components/settings/positions-settings-section";
import { getLocations } from "@/lib/timeclock-adapter";
import type { LocationId, LocationPosition } from "@/lib/timeclock-types";
import { Button } from "@timeclock/ui/components/button";
import { Input } from "@timeclock/ui/components/input";
import { Label } from "@timeclock/ui/components/label";
import { toast } from "sonner";

function isOpenToday(hours: string): boolean {
  return hours.toLowerCase() !== "closed";
}

type SettingsLocation = ReturnType<typeof getLocations>[number];

export function SettingsView({
  locationId,
  location: providedLocation,
  positions,
  onSave,
  onCreatePosition,
  onUpdatePosition,
  onRemovePosition,
}: {
  locationId: LocationId;
  location?: SettingsLocation;
  positions?: LocationPosition[];
  onSave?: (settings: {
    name: string;
    address: string;
    timezone: string;
    weekStartDay: number;
    lateGraceMinutes: number;
    noShowThresholdMinutes: number;
  }) => Promise<void>;
  onCreatePosition?: (input: { name: string; color: string }) => Promise<void>;
  onUpdatePosition?: (
    positionId: string,
    input: { name?: string; color?: string },
  ) => Promise<void>;
  onRemovePosition?: (positionId: string) => Promise<void>;
}) {
  const location =
    providedLocation ??
    getLocations().find((candidate) => candidate.id === locationId) ??
    getLocations()[0];

  return (
    <div className="grid gap-4">
      <header className="animate-in fade-in-0 duration-200">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
          Location rules for schedule weeks, late arrivals, no-shows, and operating hours.
        </p>
      </header>

      <section className="grid animate-in fade-in-0 slide-in-from-bottom-1 gap-4 duration-200 fill-mode-both lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Location settings
          </h2>
          <form
            className="grid gap-4 rounded-xl bg-card p-5 shadow-sm ring-1 ring-border"
            onSubmit={async (event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              if (onSave) {
                await onSave({
                  name: String(form.get("name") ?? location.name),
                  address: String(form.get("address") ?? location.address),
                  timezone: String(form.get("timezone") ?? location.timezone),
                  weekStartDay:
                    String(form.get("weekStart") ?? location.weekStart) === "Monday" ? 1 : 0,
                  lateGraceMinutes: Number(form.get("lateGraceMinutes") ?? location.graceMinutes),
                  noShowThresholdMinutes: Number(
                    form.get("noShowThresholdMinutes") ?? location.noShowMinutes,
                  ),
                });
                return;
              }
              toast.success("Settings saved locally for the demo");
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <Label>Location name</Label>
                <Input name="name" defaultValue={location.name} />
              </label>
              <label className="grid gap-1">
                <Label>Timezone</Label>
                <Input name="timezone" defaultValue={location.timezone} />
              </label>
              <label className="grid gap-1">
                <Label>Address</Label>
                <Input name="address" defaultValue={location.address} />
              </label>
              <label className="grid gap-1">
                <Label>Week starts on</Label>
                <Input name="weekStart" defaultValue={location.weekStart} />
              </label>
              <label className="grid gap-1">
                <Label>Late grace period (minutes)</Label>
                <Input name="lateGraceMinutes" type="number" defaultValue={location.graceMinutes} />
              </label>
              <label className="grid gap-1">
                <Label>No-show after (minutes)</Label>
                <Input
                  name="noShowThresholdMinutes"
                  type="number"
                  defaultValue={location.noShowMinutes}
                />
              </label>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Save settings</Button>
            </div>
          </form>
        </div>

        <aside className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border">
          <div className="bg-muted/30 px-4 py-3">
            <h2 className="text-sm font-semibold">Operating hours</h2>
          </div>
          <div className="divide-y divide-border/60">
            {Object.entries(location.operatingHours).map(([day, hours]) => {
              const open = isOpenToday(hours);
              return (
                <div
                  key={day}
                  className="flex items-center justify-between px-3 py-2.5 text-xs transition-colors duration-150 hover:bg-muted/20"
                >
                  <span className="font-medium">{day}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                        open
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {open ? "Open" : "Closed"}
                    </span>
                    {open ? (
                      <span className="tabular-nums text-muted-foreground">{hours}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>

      <PositionsSettingsSection
        positions={positions}
        onCreate={onCreatePosition}
        onUpdate={onUpdatePosition}
        onRemove={onRemovePosition}
      />
    </div>
  );
}
