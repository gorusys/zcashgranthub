import { useUi } from "@/i18n/useUi";
import { useMemo } from "react";
import Link from "next/link";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useGrants } from "@/hooks/useGrants";
import { programLabel } from "@/lib/grantPrograms";
import {
  benchmarkCheck,
  costBenchmark,
  findSimilarGrants,
  preflightZcg,
  type CheckLevel,
} from "@/lib/proposalPreflight";
import type { ZcgApplyDraftPayload } from "@/lib/zcgApplyDraft";

const ICON: Record<CheckLevel, JSX.Element> = {
  error: <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />,
  warning: <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500" />,
  info: <Info className="h-4 w-4 shrink-0 text-muted-foreground" />,
};

const LEVEL_RANK: Record<CheckLevel, number> = { error: 0, warning: 1, info: 2 };

export function PreflightPanel({
  draft,
  onGoToStep,
}: {
  draft: Pick<ZcgApplyDraftPayload, "formData" | "milestones" | "teamMembers">;
  onGoToStep: (step: number) => void;
}) {
  const { text: tx } = useUi();
  const { data: grants = [] } = useGrants();
  const checks = useMemo(() => {
    const out = preflightZcg(draft);
    const bench = benchmarkCheck(
      costBenchmark(grants, draft.formData.category ?? ""),
      Number(draft.formData.amount) || 0
    );
    if (!bench) return out;
    return [...out, bench].sort((a, b) => LEVEL_RANK[a.level] - LEVEL_RANK[b.level]);
  }, [draft, grants]);
  const errors = checks.filter((c) => c.level === "error").length;
  const warnings = checks.filter((c) => c.level === "warning").length;

  const similar = useMemo(
    () =>
      findSimilarGrants(
        { title: draft.formData.title ?? "", summary: draft.formData.summary ?? "" },
        grants
      ),
    [draft.formData.title, draft.formData.summary, grants]
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border p-3 sm:p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
          {errors + warnings === 0 ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-primary" /> {tx(" Preflight: no issues found")}</>
          ) : (
            <>
              {tx("Preflight: ")}{errors} {tx(" to fix, ")}{warnings} {tx(" to consider")}</>
          )}
        </div>
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.id} className="flex items-start gap-2 text-sm">
              {ICON[c.level]}
              <span className="flex-1 text-muted-foreground">{tx(c.message)}</span>
              {c.step !== undefined && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => onGoToStep(c.step!)}
                >
                  {tx("Fix")}</Button>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          {tx("These checks are advisory and cover what reviewers commonly ask about. They don't predict the committee's decision.")}</p>
      </div>

      {similar.length > 0 && (
        <div className="rounded-lg border border-border p-3 sm:p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
            <Search className="h-4 w-4 text-primary" /> {tx(" Similar past applications")}</div>
          <p className="mb-3 text-xs text-muted-foreground">
            {tx("Read how these were received. If one was declined, open it to see the committee's reasoning (or search the")}{" "}
            <Link href="/decisions" target="_blank" className="text-primary hover:underline">
              {tx("decisions archive")}</Link>
            {tx("), and say in your application what is different.")}</p>
          <ul className="divide-y divide-border">
            {similar.map(({ grant }) => (
              <li key={grant.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <span className="text-xs text-muted-foreground">{tx(programLabel(grant.program))}</span>
                <Link
                  href={`/grants/${grant.id}`}
                  target="_blank"
                  className="min-w-0 flex-1 font-medium text-foreground hover:text-primary"
                >
                  {grant.title}
                </Link>
                <StatusBadge status={grant.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
