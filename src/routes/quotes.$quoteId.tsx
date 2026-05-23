import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/quotes/$quoteId")({
  beforeLoad: ({ params }) => {
    if (params.quoteId === "new") {
      throw redirect({ to: "/quotes/new" });
    }
  },
  component: () => <Outlet />,
});
