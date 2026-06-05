import { ActivityPage } from "@/components/station-activity";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/activity")({
  component: ActivityPage,
});
