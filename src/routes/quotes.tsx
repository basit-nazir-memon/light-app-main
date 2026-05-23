import { createFileRoute, Outlet } from "@tanstack/react-router";

/** Parent layout — child routes (list, new, view, edit) render in Outlet. */
export const Route = createFileRoute("/quotes")({
  component: QuotesLayout,
});

function QuotesLayout() {
  return <Outlet />;
}
