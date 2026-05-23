import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Parent layout — list (index) and job card detail render in Outlet. */
export const Route = createFileRoute("/jobs")({
  component: () => <Outlet />,
});
