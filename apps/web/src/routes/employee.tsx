import { EmployeePortal } from "@/components/employee-portal";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/employee")({
  component: EmployeePortal,
});
