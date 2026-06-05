import {
  DEMO_POSITIONS,
  POSITION_COLOR_OPTIONS,
  positionColorClasses,
} from "@/lib/location-positions";
import type { LocationPosition } from "@/lib/timeclock-types";
import { Button } from "@timeclock/ui/components/button";
import { Input } from "@timeclock/ui/components/input";
import { Label } from "@timeclock/ui/components/label";
import { cn } from "@timeclock/ui/lib/utils";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type PositionsSettingsSectionProps = {
  positions?: LocationPosition[];
  onCreate?: (input: { name: string; color: string }) => Promise<void>;
  onUpdate?: (positionId: string, input: { name?: string; color?: string }) => Promise<void>;
  onRemove?: (positionId: string) => Promise<void>;
};

export function PositionsSettingsSection({
  positions = DEMO_POSITIONS,
  onCreate,
  onUpdate,
  onRemove,
}: PositionsSettingsSectionProps) {
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string>(POSITION_COLOR_OPTIONS[0].id);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const activePositions = positions.filter((position) => position.active);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) {
      return;
    }
    if (onCreate) {
      await onCreate({ name: trimmed, color: newColor });
    } else {
      toast.success(`Position "${trimmed}" would be created`);
    }
    setNewName("");
  }

  return (
    <section className="grid gap-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Positions
        </h2>
        <p className="mt-1 max-w-xl text-xs text-muted-foreground">
          Create the job labels managers use when assigning shifts.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border">
        <div className="divide-y divide-border">
          {activePositions.map((position) => (
            <PositionRow
              key={position.id}
              position={position}
              pending={pendingId === position.id}
              onSave={async (patch) => {
                setPendingId(position.id);
                try {
                  if (onUpdate) {
                    await onUpdate(position.id, patch);
                  } else {
                    toast.success(`Updated ${position.name}`);
                  }
                } finally {
                  setPendingId(null);
                }
              }}
              onRemove={async () => {
                setPendingId(position.id);
                try {
                  if (onRemove) {
                    await onRemove(position.id);
                  } else {
                    toast.warning(`Would remove ${position.name}`);
                  }
                } finally {
                  setPendingId(null);
                }
              }}
            />
          ))}
          {activePositions.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              No positions yet. Add the first job label below.
            </p>
          ) : null}
        </div>

        <form
          onSubmit={handleCreate}
          className="grid gap-3 border-t border-border bg-muted/10 p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto]"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="new-position-name">Add position</Label>
            <Input
              id="new-position-name"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Shift Lead"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Color</Label>
            <div className="flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-2">
              {POSITION_COLOR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-label={`Color ${option.id}`}
                  onClick={() => setNewColor(option.id)}
                  className={cn(
                    "size-5 rounded-full transition-[transform,box-shadow] duration-150",
                    option.dot,
                    newColor === option.id
                      ? cn("ring-2 ring-offset-2 ring-offset-background", option.ring)
                      : "",
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full sm:w-auto">
              <PlusIcon />
              Add position
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

function PositionRow({
  position,
  pending,
  onSave,
  onRemove,
}: {
  position: LocationPosition;
  pending: boolean;
  onSave: (patch: { name?: string; color?: string }) => Promise<void>;
  onRemove: () => Promise<void>;
}) {
  const [name, setName] = useState(position.name);
  const [color, setColor] = useState(position.color);

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
      <span
        className={cn("size-2.5 shrink-0 rounded-full", positionColorClasses(color).dot)}
        aria-hidden
      />
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => {
          if (name.trim() && name.trim() !== position.name) {
            void onSave({ name: name.trim() });
          }
        }}
        className="h-8 max-w-[12rem] text-sm"
        disabled={pending}
      />
      <div className="flex items-center gap-1">
        {POSITION_COLOR_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-label={`Set color ${option.id}`}
            disabled={pending}
            onClick={() => {
              setColor(option.id);
              void onSave({ color: option.id });
            }}
            className={cn(
              "size-4 rounded-full transition-transform duration-150 hover:scale-110",
              option.dot,
              color === option.id
                ? cn("ring-2 ring-offset-1 ring-offset-background", option.ring)
                : "opacity-50",
            )}
          />
        ))}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          aria-label={`Remove ${position.name}`}
          onClick={() => void onRemove()}
        >
          <Trash2Icon className="size-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}
