import { getDailyReport, getWeeklyReport } from "@/lib/timeclock-adapter";
import type { LocationId, ReportRow } from "@/lib/timeclock-types";
import { Badge } from "@timeclock/ui/components/badge";
import { Button } from "@timeclock/ui/components/button";
import { useState } from "react";

export function ReportsView({ locationId }: { locationId: LocationId }) {
  const [view, setView] = useState<"daily" | "weekly">("daily");
  const rows = view === "daily" ? getDailyReport(locationId) : getWeeklyReport(locationId);

  return (
    <div className="grid gap-4">
      <header className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Reports</h1>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            In-app timesheet detail and weekly scheduled-versus-actual variance. CSV export stays
            deferred.
          </p>
        </div>
        <div className="flex border">
          <Button
            variant={view === "daily" ? "default" : "ghost"}
            onClick={() => setView("daily")}
          >
            Daily
          </Button>
          <Button
            variant={view === "weekly" ? "default" : "ghost"}
            onClick={() => setView("weekly")}
          >
            Weekly
          </Button>
        </div>
      </header>

      <div className="grid gap-2 md:grid-cols-4">
        <ReportStat label="Scheduled" value={`${sum(rows, "scheduledHours").toFixed(1)}h`} />
        <ReportStat label="Actual" value={`${sum(rows, "actualHours").toFixed(1)}h`} />
        <ReportStat
          label="Variance"
          value={`${sum(rows, "variance").toFixed(1)}h`}
          variance={sum(rows, "variance")}
        />
        <ReportStat label="Breaks" value={`${sum(rows, "breakHours").toFixed(1)}h`} />
      </div>

      <div className="overflow-x-auto border">
        <table className="w-full min-w-[780px] text-left text-xs">
          <thead className="bg-muted/40 text-muted-foreground">
            <tr>
              <th className="border-b px-3 py-2 font-medium">Employee</th>
              <th className="border-b px-3 py-2 font-medium">Scheduled</th>
              <th className="border-b px-3 py-2 font-medium">Actual</th>
              <th className="border-b px-3 py-2 font-medium">Variance</th>
              <th className="border-b px-3 py-2 font-medium">Break</th>
              <th className="border-b px-3 py-2 font-medium">Edited</th>
              <th className="border-b px-3 py-2 font-medium">Attendance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.employee.id}
                className="border-b last:border-b-0 hover:bg-muted/30 transition-colors duration-150"
              >
                <td className="px-3 py-2 font-medium">{row.employee.name}</td>
                <td className="px-3 py-2 tabular-nums">{row.scheduledHours.toFixed(1)}h</td>
                <td className="px-3 py-2 tabular-nums">{row.actualHours.toFixed(1)}h</td>
                <td className={`px-3 py-2 tabular-nums font-medium ${varianceClass(row.variance)}`}>
                  {row.variance > 0 ? "+" : ""}
                  {row.variance.toFixed(1)}h
                </td>
                <td className="px-3 py-2 tabular-nums">{row.breakHours.toFixed(1)}h</td>
                <td className="px-3 py-2">
                  {row.edited ? (
                    <Badge tone="warning">Edited</Badge>
                  ) : (
                    <Badge tone="neutral">Clean</Badge>
                  )}
                </td>
                <td className="px-3 py-2">
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
                      <Badge tone="neutral">No events</Badge>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
  const valueClass =
    variance !== undefined
      ? varianceClass(variance)
      : "";

  return (
    <div className="border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
    </div>
  );
}

function sum(
  rows: ReportRow[],
  key: "scheduledHours" | "actualHours" | "variance" | "breakHours",
) {
  return rows.reduce((total, row) => total + row[key], 0);
}
