import { getEmployees } from "@/lib/timeclock-adapter";
import type { LocationId } from "@/lib/timeclock-types";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import { Input } from "@timeclock/ui/components/input";
import { Label } from "@timeclock/ui/components/label";
import { useState } from "react";
import { toast } from "sonner";

export function EmployeesView({ locationId }: { locationId: LocationId }) {
  const employees = getEmployees(locationId);
  const [showPin, setShowPin] = useState(false);
  const [editing, setEditing] = useState<string | undefined>();

  const editingEmployee =
    editing && editing !== "new"
      ? employees.find((employee) => employee.id === editing)
      : undefined;

  return (
    <div className="grid gap-4">
      <header className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Employees</h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Active team roster scoped to the selected location, with role, position, PIN treatment,
            and assignment state.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing("new");
            toast.info("Create employee is staged as a frontend modal for backend wiring.");
          }}
        >
          Add employee
        </Button>
      </header>

      <div className="flex items-center justify-between border px-3 py-2">
        <p className="text-xs text-muted-foreground">{employees.length} assigned employees</p>
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={showPin}
            onChange={(event) => setShowPin(event.target.checked)}
          />
          Show PINs
        </label>
      </div>

      <div className="overflow-x-auto border">
        <table className="w-full min-w-[780px] border-collapse text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="border-b px-3 py-2 font-medium">Employee</th>
              <th className="border-b px-3 py-2 font-medium">Role</th>
              <th className="border-b px-3 py-2 font-medium">Position</th>
              <th className="border-b px-3 py-2 font-medium">PIN</th>
              <th className="border-b px-3 py-2 font-medium">Status</th>
              <th className="border-b px-3 py-2 font-medium">Locations</th>
              <th className="border-b px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr
                key={employee.id}
                className="border-b last:border-b-0 hover:bg-muted/30 transition-colors duration-150"
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full ${employee.avatarColor} text-[11px] font-semibold text-white`}
                    >
                      {employee.initials}
                    </span>
                    <span className="font-medium">{employee.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 capitalize">{employee.role}</td>
                <td className="px-3 py-2">{employee.position}</td>
                <td className="px-3 py-2 font-mono">{showPin ? employee.pin : "••••"}</td>
                <td className="px-3 py-2">
                  <Badge tone={employee.active ? "success" : "danger"}>
                    {employee.active ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td className="px-3 py-2">{employee.assignedLocationIds.length}</td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditing(employee.id)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toast.warning(
                          `${employee.name} would be deactivated after backend confirmation.`,
                        )
                      }
                    >
                      Deactivate
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal overlay */}
      {editing ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-150"
          onClick={(event) => {
            if (event.target === event.currentTarget) setEditing(undefined);
          }}
        >
          <div className="w-full max-w-md border bg-background shadow-xl p-4 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
            <h2 className="mb-3 text-sm font-semibold">
              {editing === "new" ? "Add employee" : `Edit: ${editingEmployee?.name ?? ""}`}
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1">
                <Label>Name</Label>
                <Input defaultValue={editing === "new" ? "" : editingEmployee?.name} />
              </label>
              <label className="grid gap-1">
                <Label>Position</Label>
                <Input defaultValue={editing === "new" ? "" : editingEmployee?.position} />
              </label>
              <label className="grid gap-1">
                <Label>PIN</Label>
                <Input
                  maxLength={4}
                  defaultValue={editing === "new" ? "" : editingEmployee?.pin}
                />
              </label>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(undefined)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setEditing(undefined);
                  toast.success("Employee changes staged");
                }}
              >
                Save employee
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
