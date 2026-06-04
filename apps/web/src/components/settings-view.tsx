import { getLocations } from "@/lib/timeclock-adapter";
import type { LocationId } from "@/lib/timeclock-types";
import { Button } from "@timeclock/ui/components/button";
import { Input } from "@timeclock/ui/components/input";
import { Label } from "@timeclock/ui/components/label";
import { toast } from "sonner";

function isOpenToday(hours: string): boolean {
  return hours.toLowerCase() !== "closed";
}

export function SettingsView({ locationId }: { locationId: LocationId }) {
  const location =
    getLocations().find((candidate) => candidate.id === locationId) ?? getLocations()[0];

  return (
    <div className="grid gap-4">
      <header className="border-b pb-4">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
          MVP location controls for timezone, week start, grace/no-show thresholds, and operating
          hours.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid gap-4">
          <div className="border-b pb-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Location settings
            </h2>
          </div>
          <form
            className="grid gap-4 border p-4"
            onSubmit={(event) => {
              event.preventDefault();
              toast.success("Settings saved locally for the demo");
            }}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <Label>Location name</Label>
                <Input defaultValue={location.name} />
              </label>
              <label className="grid gap-1">
                <Label>Timezone</Label>
                <Input defaultValue={location.timezone} />
              </label>
              <label className="grid gap-1">
                <Label>Address</Label>
                <Input defaultValue={location.address} />
              </label>
              <label className="grid gap-1">
                <Label>Week start</Label>
                <Input defaultValue={location.weekStart} />
              </label>
              <label className="grid gap-1">
                <Label>Late grace minutes</Label>
                <Input type="number" defaultValue={location.graceMinutes} />
              </label>
              <label className="grid gap-1">
                <Label>No-show threshold minutes</Label>
                <Input type="number" defaultValue={location.noShowMinutes} />
              </label>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Save settings</Button>
            </div>
          </form>
        </div>

        <aside className="border">
          <div className="border-b px-3 py-2">
            <h2 className="text-sm font-medium">Operating hours</h2>
          </div>
          <div className="divide-y">
            {Object.entries(location.operatingHours).map(([day, hours]) => {
              const open = isOpenToday(hours);
              return (
                <div key={day} className="flex items-center justify-between px-3 py-2 text-xs">
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
                      <span className="text-muted-foreground tabular-nums">{hours}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </section>
    </div>
  );
}
