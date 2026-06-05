import { Button } from "@timeclock/ui/components/button";
import { Input } from "@timeclock/ui/components/input";
import { Label } from "@timeclock/ui/components/label";
import { XIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern (US)" },
  { value: "America/Chicago", label: "Central (US)" },
  { value: "America/Denver", label: "Mountain (US)" },
  { value: "America/Los_Angeles", label: "Pacific (US)" },
  { value: "America/Phoenix", label: "Arizona" },
  { value: "UTC", label: "UTC" },
] as const;

const selectClass =
  "motion-product h-10 w-full rounded-lg border border-input bg-muted/20 px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

export interface NewLocationInput {
  name: string;
  address: string;
  timezone: string;
}

interface NewLocationDialogProps {
  open: boolean;
  pending?: boolean;
  onClose: () => void;
  onCreate: (input: NewLocationInput) => Promise<void>;
}

export function NewLocationDialog({ open, pending = false, onClose, onCreate }: NewLocationDialogProps) {
  const formId = useId();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState<string>(TIMEZONES[0].value);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, pending]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in-0 duration-200"
      onClick={pending ? undefined : onClose}
      role="presentation"
    >
      <form
        id={formId}
        onSubmit={async (event) => {
          event.preventDefault();
          await onCreate({ name: name.trim(), address: address.trim(), timezone });
          setName("");
          setAddress("");
          setTimezone(TIMEZONES[0].value);
        }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-location-dialog-title"
        className="motion-product flex w-full max-w-md flex-col overflow-hidden rounded-2xl bg-card shadow-2xl ring-1 ring-border animate-in fade-in-0 zoom-in-95 duration-200"
      >
        <header className="relative border-b border-border px-5 pt-5 pb-4">
          <h2 id="new-location-dialog-title" className="pr-10 text-lg font-semibold tracking-tight">
            New location
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Adds a site with default hours and positions for your team.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={pending}
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 text-muted-foreground"
          >
            <XIcon />
          </Button>
        </header>

        <div className="space-y-4 px-5 py-5">
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-name`}>Location name</Label>
            <Input
              id={`${formId}-name`}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Harbor Roastery"
              required
              autoFocus
              disabled={pending}
              className="motion-product h-10"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-address`}>Address</Label>
            <Input
              id={`${formId}-address`}
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="123 Main St, City, ST"
              required
              disabled={pending}
              className="motion-product h-10"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${formId}-timezone`}>Timezone</Label>
            <select
              id={`${formId}-timezone`}
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              disabled={pending}
              className={selectClass}
            >
              {TIMEZONES.map((zone) => (
                <option key={zone.value} value={zone.value}>
                  {zone.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-border bg-card/95 px-5 py-4 backdrop-blur-sm">
          <Button type="button" variant="outline" disabled={pending} onClick={onClose} className="motion-product">
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={pending || !name.trim() || !address.trim()} className="motion-product">
            {pending ? "Creating…" : "Create location"}
          </Button>
        </footer>
      </form>
    </div>
  );
}
