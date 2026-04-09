import Link from "next/link";
import { Link2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RelatedItem } from "@/lib/related/resolveRelated";

function kindLabel(kind: RelatedItem["kind"]): string {
  if (kind === "zcg") return "ZCG";
  if (kind === "coinholder") return "Coinholder";
  return "ZecHub DAO";
}

export function RelatedRecordsCard({
  items,
  isLoading,
  isError,
  errorMessage,
}: {
  items: RelatedItem[] | undefined;
  isLoading: boolean;
  isError: boolean;
  errorMessage?: string;
}) {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4 text-muted-foreground" />
          Related records
        </CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">
          One real-world application can appear in multiple places (ZCG GitHub, Coinholder GitHub,
          ZecHub mini-grants on DAO DAO). Links below are suggestions from maintainer mappings,
          cross-references in text, and title similarity—not merged status.
        </p>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {isLoading && (
          <p className="text-xs text-muted-foreground">Loading suggestions…</p>
        )}
        {isError && (
          <p className="text-xs text-destructive">
            {errorMessage ?? "Could not load related records."}
          </p>
        )}
        {!isLoading && !isError && (!items || items.length === 0) && (
          <p className="text-xs text-muted-foreground">
            No related records found yet. Browse{" "}
            <Link href="/zechub/proposals" className="text-primary underline-offset-2 hover:underline">
              ZecHub proposals
            </Link>{" "}
            or add explicit links in{" "}
            <code className="rounded bg-secondary px-1 py-0.5 text-[10px]">
              src/data/grant-links.json
            </code>
            .
          </p>
        )}
        {items?.map((r, i) => {
          const internal = r.href.startsWith("/");
          const row = (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/40 bg-secondary/20 px-3 py-2">
              <Badge variant="outline" className="text-[10px] font-normal">
                {kindLabel(r.kind)}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-normal capitalize">
                {r.confidence}
              </Badge>
              <span className="min-w-0 flex-1 text-sm font-medium text-foreground">
                {r.label}
              </span>
            </div>
          );
          const body = (
            <div key={`${r.href}-${i}`} className="space-y-1">
              {internal ? (
                <Link href={r.href} className="block transition-opacity hover:opacity-90">
                  {row}
                </Link>
              ) : (
                <a
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block transition-opacity hover:opacity-90"
                >
                  {row}
                </a>
              )}
              {r.subtitle && (
                <p className="pl-1 text-[11px] text-muted-foreground line-clamp-2">
                  {r.subtitle}
                </p>
              )}
              <p className="pl-1 text-[10px] text-muted-foreground/80">
                {r.reason.replace(/_/g, " ")}
              </p>
            </div>
          );
          return body;
        })}
      </CardContent>
    </Card>
  );
}
