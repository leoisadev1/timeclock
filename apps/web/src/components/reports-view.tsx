import { getDailyReport, getWeeklyReport } from "@/lib/timeclock-adapter";
import type { LocationId, ReportRow } from "@/lib/timeclock-types";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import { useState } from "react";

export function ReportsView({
  locationId,
  dailyRows,
  weeklyRows,
}: {
  locationId: LocationId;
  dailyRows?: ReportRow[];
  weeklyRows?: ReportRow[];
}) {
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const rows =
    view === "daily"
      ? (dailyRows ?? getDailyReport(locationId))
      : (weeklyRows ?? getWeeklyReport(locationId));

  return (
    <div className="grid gap-5">
      <header className="flex animate-in fade-in-0 flex-wrap items-start justify-between gap-3 duration-200">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Timecard reports</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare scheduled hours with the time employees actually worked.
          </p>
        </div>
        <div className="flex gap-1 rounded-full bg-muted p-1 ring-1 ring-border">
          <Button
            variant={view === "daily" ? "default" : "ghost"}
            size="sm"
            className="rounded-full transition-colors duration-150"
            onClick={() => setView("daily")}
          >
            Daily
          </Button>
          <Button
            variant={view === "weekly" ? "default" : "ghost"}
            size="sm"
            className="rounded-full transition-colors duration-150"
            onClick={() => setView("weekly")}
          >
            Weekly
          </Button>
        </div>
      </header>

      <div className="grid animate-in fade-in-0 slide-in-from-bottom-1 gap-3 duration-200 fill-mode-both md:grid-cols-4">
        <ReportStat label="Scheduled" value={`${sum(rows, "scheduledHours").toFixed(1)}h`} />
        <ReportStat label="Actual" value={`${sum(rows, "actualHours").toFixed(1)}h`} />
        <ReportStat
          label="Difference"
          value={`${sum(rows, "variance") > 0 ? "+" : ""}${sum(rows, "variance").toFixed(1)}h`}
          variance={sum(rows, "variance")}
        />
        <ReportStat label="Breaks" value={`${sum(rows, "breakHours").toFixed(1)}h`} />
      </div>

      <div className="overflow-hidden rounded-xl bg-card shadow-sm ring-1 ring-border animate-in fade-in-0 slide-in-from-bottom-1 duration-200 fill-mode-both delay-75">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold">Employee</th>
                <th className="px-4 py-3 text-xs font-semibold">Scheduled</th>
                <th className="px-4 py-3 text-xs font-semibold">Actual</th>
                <th className="px-4 py-3 text-xs font-semibold">Difference</th>
                <th className="px-4 py-3 text-xs font-semibold">Break</th>
                <th className="px-4 py-3 text-xs font-semibold">Edited</th>
                <th className="px-4 py-3 text-xs font-semibold">Attendance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {rows.map((row) => (
                <tr
                  key={row.employee.id}
                  className="transition-colors duration-150 hover:bg-muted/30"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white ${row.employee.avatarColor}`}
                      >
                        {row.employee.initials}
                      </span>
                      <span className="font-medium">{row.employee.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.scheduledHours.toFixed(1)}h</td>
                  <td className="px-4 py-3 tabular-nums">{row.actualHours.toFixed(1)}h</td>
                  <td
                    className={`px-4 py-3 tabular-nums font-semibold ${varianceClass(row.variance)}`}
                  >
                    {row.variance > 0 ? "+" : ""}
                    {row.variance.toFixed(1)}h
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.breakHours.toFixed(1)}h</td>
                  <td className="px-4 py-3">
                    {row.edited ? (
                      <Badge tone="warning">Edited</Badge>
                    ) : (
                      <Badge tone="neutral">Not edited</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {row.attendance.length ? (
                        row.attendance.map((attendance) => (
                          <Badge
                            key={`${row.employee.id}-${attendance}`}
                            tone={
                              attendance === "late" || attendance === "no-show"
                                ? "danger"
                                : attendance === "unscheduled"
                                  ? "warning"
                                  : "success"
                            }
                          >
                            {attendance}
                          </Badge>
                        ))
                      ) : (
                        <Badge tone="neutral">No punches</Badge>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function varianceClass(variance: number): string {
  if (variance > 0) return "text-emerald-600 dark:text-emerald-400";
  if (variance < 0) return "text-destructive";
  return "";
}

function ReportStat({
  label,
  value,
  variance,
}: {
  label: string;
  value: string;
  variance?: number;
}) {
  const valueClass = variance !== undefined ? varianceClass(variance) : "";
  return (
    <div className="rounded-xl bg-card p-4 shadow-sm ring-1 ring-border transition-[box-shadow] duration-200 hover:shadow-md">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums tracking-tight ${valueClass}`}>{value}</p>
    </div>
  );
}

function sum(rows: ReportRow[], key: "scheduledHours" | "actualHours" | "variance" | "breakHours") {
  return rows.reduce((total, row) => total + row[key], 0);
}
