import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { QuoteForm, defaultQuotePayload } from "@/components/QuoteForm";
import { QuoteEditorLayout } from "@/components/QuoteEditorLayout";
import { useCustomers, useVehicles, useAddQuote } from "@/lib/store";
import { quotePayloadToApi } from "@/lib/quotes";
import { toast } from "sonner";

export const Route = createFileRoute("/quotes/new")({ component: NewQuotePage });

function NewQuotePage() {
  const navigate = useNavigate();
  const { data: customers = [] } = useCustomers();
  const { data: vehicles = [] } = useVehicles();
  const addQuote = useAddQuote();

  return (
    <QuoteEditorLayout title="Create quotation">
      <QuoteForm
        initial={defaultQuotePayload()}
        customers={customers}
        vehicles={vehicles}
        submitLabel="Create quotation"
        loading={addQuote.isPending}
        onSubmit={(payload) => {
          addQuote.mutate(quotePayloadToApi({ ...payload, status: "Draft" }), {
            onSuccess: () => {
              toast.success("Quotation created");
              navigate({ to: "/quotes" });
            },
            onError: (e) => toast.error(e.message),
          });
        }}
      />
    </QuoteEditorLayout>
  );
}
