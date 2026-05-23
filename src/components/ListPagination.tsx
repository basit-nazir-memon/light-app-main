import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function ListPagination({ page, totalPages, total, onPageChange, className }: Props) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 pt-4 ${className ?? ""}`}>
      <p className="text-sm text-muted-foreground">
        {total === 0 ? "No results" : `${total} total · Page ${page} of ${totalPages}`}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="size-4 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || totalPages === 0}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
