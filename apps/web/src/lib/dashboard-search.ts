import type { ManagerView } from "@/components/app-shell";
import { parseAsString, parseAsStringLiteral } from "nuqs";

export const MANAGER_VIEWS = [
  "schedule",
  "employees",
  "reports",
  "settings",
] as const satisfies readonly ManagerView[];

export const dashboardSearchParams = {
  view: parseAsStringLiteral(MANAGER_VIEWS),
  location: parseAsString,
  week: parseAsString,
};

export const defaultManagerView = (): ManagerView => "schedule";
