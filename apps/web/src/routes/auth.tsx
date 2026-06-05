import { Auth3 } from "@/components/blocks/auth-3";
import { createFileRoute, redirect } from "@tanstack/react-router";

type AuthSearch = {
  reason?: "dashboard";
  redirect?: "/dashboard";
};

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): AuthSearch => ({
    reason: search.reason === "dashboard" ? "dashboard" : undefined,
    redirect: search.redirect === "/dashboard" ? "/dashboard" : undefined,
  }),
  beforeLoad: ({ context, search }) => {
    if (context.userId) {
      throw redirect({ to: search.redirect ?? "/dashboard" });
    }
  },
  component: AuthRoute,
});

function AuthRoute() {
  const search = Route.useSearch();
  return <Auth3 redirectTo={search.redirect ?? "/dashboard"} reason={search.reason} />;
}
