import { AuthenticateWithRedirectCallback } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/sso-callback")({
  component: SsoCallbackRoute,
});

function SsoCallbackRoute() {
  return (
    <div className="grid min-h-svh place-items-center bg-background px-6 text-foreground">
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/auth?reason=dashboard&redirect=/dashboard"
        signUpFallbackRedirectUrl="/auth?reason=dashboard&redirect=/dashboard"
      />
    </div>
  );
}
