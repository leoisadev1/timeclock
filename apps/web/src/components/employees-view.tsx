import { EmployeeAvatar } from "@/components/employee-avatar";
import { getEmployees, getLocations } from "@/lib/timeclock-adapter";
import type { Employee, LocationId } from "@/lib/timeclock-types";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@timeclock/ui/components/dropdown-menu";
import { Input } from "@timeclock/ui/components/input";
import { Label } from "@timeclock/ui/components/label";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EllipsisVerticalIcon,
  FilterIcon,
  PlusIcon,
  SearchIcon,
  UploadIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type StatusFilter = "all" | "active" | "inactive";

const PAGE_SIZE = 20;

function roleLabel(role: Employee["role"]) {
  if (role === "admin") return "Admin";
  if (role === "manager") return "Manager";
  return "Employee";
}

function contactPhone(employee: Employee) {
  const digits = employee.pin.padStart(4, "0");
  return `(555) ${digits.slice(0, 3)}-${digits.slice(3)}`;
}

function contactEmail(employee: Employee) {
  return employee.email ?? `${employee.name.split(" ")[0]?.toLowerCase() ?? "team"}@timeclock.demo`;
}

export function EmployeesView({
  locationId,
  employees: providedEmployees,
  onDeactivate,
}: {
  locationId: LocationId;
  employees?: Employee[];
  onDeactivate?: (employeeId: string) => Promise<void>;
}) {
  const allEmployees = providedEmployees ?? getEmployees(locationId);
  const locationNames = useMemo(
    () => new Map(getLocations().map((loc) => [loc.id, loc.name])),
    [],
  );

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showPin, setShowPin] = useState(false);
  const [editing, setEditing] = useState<string | undefined>();

  const editingEmployee =
    editing && editing !== "new"
      ? allEmployees.find((employee) => employee.id === editing)
      : undefined;

  const activeCount = allEmployees.filter((e) => e.active).length;
  const inactiveCount = allEmployees.length - activeCount;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return allEmployees.filter((employee) => {
      if (statusFilter === "active" && !employee.active) return false;
      if (statusFilter === "inactive" && employee.active) return false;
      if (!query) return true;
      return (
        employee.name.toLowerCase().includes(query) ||
        employee.position.toLowerCase().includes(query) ||
        contactEmail(employee).toLowerCase().includes(query)
      );
    });
  }, [allEmployees, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const allPageSelected =
    pageRows.length > 0 && pageRows.every((row) => selected.has(row.id));

  function toggleAllOnPage() {
    setSelected((current) => {
      const next = new Set(current);
      if (allPageSelected) {
        for (const row of pageRows) next.delete(row.id);
      } else {
        for (const row of pageRows) next.add(row.id);
      }
      return next;
    });
  }

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage roster, roles, and location assignments
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => toast.info("Import coming soon")}>
            <UploadIcon />
            Import
          </Button>
          <Button
            onClick={() => {
              setEditing("new");
              toast.info("Create employee is staged for backend wiring.");
            }}
          >
            <PlusIcon />
            New member
          </Button>
        </div>
      </header>

      <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap gap-1 rounded-lg bg-muted/50 p-1">
            {(
              [
                ["all", `All (${allEmployees.length})`],
                ["active", `Active (${activeCount})`],
                ["inactive", `Inactive (${inactiveCount})`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setStatusFilter(key);
                  setPage(0);
                }}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-150 ${
                  statusFilter === key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:w-56 sm:flex-none">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(0);
                }}
                placeholder="Search members..."
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowPin((v) => !v)}>
              <FilterIcon />
              {showPin ? "Hide PINs" : "Show PINs"}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="border-b border-border bg-muted/30 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleAllOnPage}
                    className="accent-primary"
                    aria-label="Select all on page"
                  />
                </th>
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3">Locations</th>
                <th className="px-4 py-3">PIN</th>
                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pageRows.map((employee) => {
                const locations = employee.assignedLocationIds
                  .map((id) => locationNames.get(id))
                  .filter(Boolean) as string[];

                return (
                  <tr
                    key={employee.id}
                    className="transition-colors duration-150 hover:bg-muted/20"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(employee.id)}
                        onChange={() =>
                          setSelected((current) => {
                            const next = new Set(current);
                            if (next.has(employee.id)) next.delete(employee.id);
                            else next.add(employee.id);
                            return next;
                          })
                        }
                        className="accent-primary"
                        aria-label={`Select ${employee.name}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <EmployeeAvatar
                          name={employee.name}
                          initials={employee.initials}
                          avatarColor={employee.avatarColor}
                          avatarUrl={employee.avatarUrl}
                          employeeId={employee.id}
                          size="md"
                        />
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{employee.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {roleLabel(employee.role)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-foreground">{contactPhone(employee)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {contactEmail(employee)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={employee.active ? "success" : "neutral"}>
                        {employee.active ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground">{employee.position}</td>
                    <td className="px-4 py-3">
                      <p className="truncate text-sm text-foreground">
                        {locations[0] ?? "—"}
                        {locations.length > 1 ? ` +${locations.length - 1}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm tabular-nums">
                      {showPin ? employee.pin : "••••"}
                    </td>
                    <td className="px-4 py-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={`Actions for ${employee.name}`}
                        >
                          <EllipsisVerticalIcon className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditing(employee.id)}>
                            Edit member
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            disabled={!employee.active}
                            onClick={async () => {
                              if (onDeactivate) {
                                await onDeactivate(employee.id);
                                return;
                              }
                              toast.warning(
                                `${employee.name} would be deactivated after backend confirmation.`,
                              );
                            }}
                          >
                            Deactivate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm font-medium text-foreground">No members match your filters</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try a different search or status filter.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm sm:px-5">
          <p className="text-muted-foreground">
            Showing {filtered.length === 0 ? 0 : safePage * PAGE_SIZE + 1}–
            {Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={safePage === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeftIcon />
            </Button>
            <span className="min-w-[4rem] text-center text-xs tabular-nums text-muted-foreground">
              {safePage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={safePage >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              aria-label="Next page"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </div>

      {editing ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background/80 backdrop-blur-sm animate-in fade-in-0 duration-150"
          onClick={(event) => {
            if (event.target === event.currentTarget) setEditing(undefined);
          }}
        >
          <div className="w-full max-w-md animate-in fade-in-0 slide-in-from-bottom-4 rounded-2xl bg-card p-6 shadow-2xl ring-1 ring-border duration-200">
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
