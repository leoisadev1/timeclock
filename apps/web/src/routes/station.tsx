import { StationKiosk } from "@/components/station-kiosk";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/station")({
  component: StationKiosk,
});
