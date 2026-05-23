import { Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const QUOTE_EDITOR_SUBTITLE =
  "Add parts, labour, warranty, and optional discount.";

type Props = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function QuoteEditorLayout({ title, subtitle = QUOTE_EDITOR_SUBTITLE, children }: Props) {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/quotes"><ArrowLeft className="size-5" /></Link>
          </Button>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </AppLayout>
  );
}
