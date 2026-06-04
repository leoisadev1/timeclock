import { Button } from "@timeclock/ui/components/button";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: HomeComponent,
});

function HomeComponent() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background p-6 text-foreground">
      <Button>Button</Button>
    </main>
  );
}
