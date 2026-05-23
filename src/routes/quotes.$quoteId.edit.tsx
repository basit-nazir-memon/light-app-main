import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { QuoteForm } from "@/components/QuoteForm";
import { QuoteEditorLayout } from "@/components/QuoteEditorLayout";
import { useQuote, useCustomers, useVehicles, useUpdateQuote } from "@/lib/store";
import { quotePayloadToApi, quoteToPayload } from "@/lib/quotes";
import { toast } from "sonner";

export const Route = createFileRoute("/quotes/$quoteId/edit")({ component: EditQuotePage });

function EditQuotePage() {
  const { quoteId } = Route.useParams();
  const navigate = useNavigate();
  const { data: quote, isLoading, error } = useQuote(quoteId);
  const { data: customers = [] } = useCustomers();
  const { data: vehicles = [] } = useVehicles();
  const updateQuote = useUpdateQuote();

  if (isLoading) {
    return (
      <QuoteEditorLayout title="Edit quotation">
        <div className="p-12 text-center text-muted-foreground">Loading…</div>
      </QuoteEditorLayout>
    );
  }

  if (error || !quote) {
    return (
      <QuoteEditorLayout title="Edit quotation">
        <div className="p-12 text-center">
          <p className="text-destructive">Quotation not found.</p>
          <Button asChild className="mt-4">
            <Link to="/quotes">Back to quotes</Link>
          </Button>
        </div>
      </QuoteEditorLayout>
    );
  }

  return (
    <QuoteEditorLayout title="Edit quotation">
      <QuoteForm
        initial={quoteToPayload(quote)}
        customers={customers}
        vehicles={vehicles}
        submitLabel="Save quotation"
        loading={updateQuote.isPending}
        onSubmit={(payload) => {
          updateQuote.mutate(
            { id: quoteId, ...quotePayloadToApi(payload) },
            {
              onSuccess: () => {
                toast.success("Quotation updated");
                navigate({ to: "/quotes" });
              },
              onError: (e) => toast.error(e.message),
            },
          );
        }}
      />
    </QuoteEditorLayout>
  );
}
