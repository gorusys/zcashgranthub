import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Items per page for grant lists and ZecHub proposal grid */
export const LIST_PAGE_SIZE = 12;

export function parsePageQuery(raw: string | string[] | undefined): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = parseInt(String(s ?? "1"), 10);
  if (Number.isNaN(n) || n < 1) return 1;
  return n;
}

export function totalPagesForCount(count: number, pageSize = LIST_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(Math.max(0, count) / pageSize));
}

/** Page numbers with ellipses for large totals */
export function buildPageList(
  current: number,
  total: number
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let d = -1; d <= 1; d++) {
    const p = current + d;
    if (p >= 1 && p <= total) pages.add(p);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: Array<number | "ellipsis"> = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

export function ListPagination({
  className,
  page,
  totalPages,
  onPageChange,
}: {
  className?: string;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const items = buildPageList(page, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 border-t border-border/50 pt-6 sm:flex-row sm:flex-wrap sm:justify-center",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Previous</span>
        </Button>
        {items.map((it, i) =>
          it === "ellipsis" ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-9 min-w-9 items-center justify-center px-1 text-sm text-muted-foreground"
            >
              …
            </span>
          ) : (
            <Button
              key={it}
              type="button"
              variant={it === page ? "default" : "ghost"}
              size="sm"
              className="min-w-9"
              onClick={() => onPageChange(it)}
            >
              {it}
            </Button>
          )
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="gap-1"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground sm:ml-2">
        Page {page} of {totalPages}
      </p>
    </div>
  );
}
