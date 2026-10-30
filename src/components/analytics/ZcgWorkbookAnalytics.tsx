import { formatSpreadsheetValue } from "@/i18n/format";
import { useUi } from "@/i18n/useUi";
import { useMemo, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ZCG_PUBLIC_SPREADSHEET_URL } from "@/lib/zcgPublicSpreadsheet";
import type { PublicSpreadsheetPayload } from "@/lib/zcgSpreadsheetPayload";
import { AlertCircle, ExternalLink, Table2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const TT = {
  background: "hsl(220, 30%, 12%)",
  border: "1px solid hsl(220, 20%, 18%)",
  borderRadius: 8,
  color: "#fff",
};

const AXIS = { fill: "hsl(215, 20%, 55%)", fontSize: 11 };

const PIE_COLORS = [
  "hsl(40, 90%, 56%)",
  "hsl(173, 58%, 45%)",
  "hsl(280, 65%, 60%)",
  "hsl(210, 80%, 55%)",
  "hsl(0, 70%, 55%)",
  "hsl(130, 50%, 45%)",
  "hsl(30, 80%, 50%)",
  "hsl(300, 45%, 55%)",
];

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  const { text: tx } = useUi();
  if (!value) return null;
  return (
    <div className="rounded-lg border border-border/40 bg-secondary/15 px-3 py-2.5 transition-colors hover:bg-secondary/25">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {tx(label)}
      </div>
      <div className="mt-1 font-mono text-sm font-semibold text-foreground sm:text-[15px]">
        {tx(value)}
      </div>
    </div>
  );
}

function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  const { text: tx } = useUi();
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
      {hint ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{tx(hint)}</p>
      ) : null}
    </div>
  );
}

type Props = {
  sheet: PublicSpreadsheetPayload | undefined;
  loading: boolean;
  error: Error | null;
};

export function ZcgWorkbookAnalytics({ sheet, loading, error }: Props) {
  const { text: tx, locale: uiLocale } = useUi();
  const scenarioChartData = useMemo(() => {
    if (!sheet) return [];
    const zcg = sheet.zcg.sensitivityCurrent;
    const zcgR = sheet.zcg.sensitivityWithReceivable;
    const ch = sheet.coinholder.sensitivityCurrent;
    return zcg.map((row, i) => ({
      priceLabel: `$${row.zecUsdPrice.toFixed(0)}`,
      zcgCurrentUsdM: row.usdTotal / 1_000_000,
      zcgWithReceivableUsdM: (zcgR[i]?.usdTotal ?? 0) / 1_000_000,
      coinholderUsdM: (ch[i]?.usdTotal ?? 0) / 1_000_000,
    }));
  }, [sheet]);

  const lockboxBarData = useMemo((): {
    rows: Record<string, string | number>[];
    keys: string[];
  } | null => {
    if (!sheet) return null;
    const g = new Map<string, { label: string; usd: number }[]>();
    for (const x of sheet.inputs.scenarioUsd) {
      const arr = g.get(x.group) ?? [];
      arr.push({ label: x.label.replace(/USD value at\s*/i, ""), usd: x.usd });
      g.set(x.group, arr);
    }
    const keys = [...g.keys()];
    if (keys.length === 0) return null;
    const maxLen = Math.max(...keys.map((k) => g.get(k)!.length));
    const rows: Record<string, string | number>[] = [];
    for (let i = 0; i < maxLen; i++) {
      const row: Record<string, string | number> = {
        scenario: ["Spot", "2×", "3×"][i] ?? `S${i + 1}`,
      };
      for (const k of keys) {
        const v = g.get(k)![i];
        row[k] = v ? Math.round(v.usd / 1_000_000) : 0;
      }
      rows.push(row);
    }
    return { rows, keys };
  }, [sheet]);

  const discSpendRatio = useMemo(() => {
    if (!sheet?.discBudget2026.annualBudgetUsd || !sheet.discBudget2026.spentUsd)
      return null;
    const a = sheet.discBudget2026.annualBudgetUsd;
    const s = sheet.discBudget2026.spentUsd;
    if (a <= 0) return null;
    return Math.min(100, Math.round((s / a) * 1000) / 10);
  }, [sheet]);

  if (error) {
    return (
      <Card className="mb-8 border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 py-6">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">
              {tx("Could not load the public spreadsheet")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading && !sheet) {
    return (
      <Card className="mb-8 border-border/50">
        <CardContent className="py-12">
          <div className="mx-auto max-w-md space-y-3 animate-pulse">
            <div className="h-8 rounded bg-secondary" />
            <div className="h-40 rounded-lg bg-secondary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!sheet) return null;

  const s = sheet;

  return (
    <Card className="mb-10 border-border/50 bg-card shadow-sm">
      <CardHeader className="space-y-2 border-b border-border/40 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <Table2 className="h-5 w-5 text-primary" />
              {tx("Community grants analytics")}</CardTitle>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {tx("Figures reflect the sheet at")}{" "}
              <span className="font-mono text-foreground">
                {new Date(s.fetchedAt).toLocaleString(uiLocale)}
              </span>
              .
            </p>
          </div>
          <a
            href={ZCG_PUBLIC_SPREADSHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 self-start rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-secondary/50"
          >
            {tx("Open sheet")}<ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4 flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 bg-muted/80 p-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              {tx("Overview")}</TabsTrigger>
            <TabsTrigger value="treasury" className="text-xs sm:text-sm">
              {tx("Treasury")}</TabsTrigger>
            <TabsTrigger value="zcg-ops" className="text-xs sm:text-sm">
              {tx("ZCG operations")}</TabsTrigger>
            <TabsTrigger value="coinholder" className="text-xs sm:text-sm">
              {tx("Coinholder")}</TabsTrigger>
            <TabsTrigger value="registers" className="text-xs sm:text-sm">
              {tx("Grant registers")}</TabsTrigger>
            <TabsTrigger value="reference" className="text-xs sm:text-sm">
              {tx("Inputs")}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label={tx("ZCG milestone payments")}
                value={String(s.zcgGrants.totals.milestoneRows)}
              />
              <Metric
                label={tx("ZEC disbursed (sum milestones)")}
                value={`${s.zcgGrants.totals.sumZec.toLocaleString(uiLocale)} ZEC`}
              />
              <Metric
                label={tx("Independent contractor payouts")}
                value={String(s.icPayouts.totals.lines)}
              />
              <Metric
                label={tx("Coinholder funded proposals")}
                value={String(s.coinholderGrants.totals.rows)}
              />
              <Metric
                label={tx("Liquidity transfers")}
                value={String(s.liquidity.transfers.length)}
              />
              <Metric
                label={tx("2026 Disc. budget spent / annual")}
                value={
                  s.discBudget2026.spentUsd != null &&
                  s.discBudget2026.annualBudgetUsd != null
                    ? `$${Math.round(s.discBudget2026.spentUsd).toLocaleString(uiLocale)} / $${Math.round(s.discBudget2026.annualBudgetUsd).toLocaleString(uiLocale)}`
                    : undefined
                }
              />
              <Metric
                label={tx("Committee stipend payments")}
                value={String(s.stipend.totals.lines)}
              />
              <Metric
                label={tx("ZCG proposal history")}
                value={String(s.zcgAllGrantsTracking.totalRows)}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-border/40 bg-secondary/10">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">{tx("ZCG grant status mix")}</CardTitle>
                </CardHeader>
                <CardContent className="h-[220px]">
                  {s.zcgGrants.byStatus.length === 0 ? (
                    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {tx("Status information unavailable.")}</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={s.zcgGrants.byStatus.slice(0, 8).map((row) => ({ ...row, name: tx(row.name) }))}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={78}
                          paddingAngle={2}
                          label={false}
                        >
                          {s.zcgGrants.byStatus.map((_, i) => (
                            <Cell
                              key={i}
                              fill={PIE_COLORS[i % PIE_COLORS.length]!}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={TT} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card className="border-border/40 bg-secondary/10">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">
                    {tx("Coinholder decision mix")}</CardTitle>
                </CardHeader>
                <CardContent className="h-[220px]">
                  {s.coinholderAllGrantsTracking.byDecision.length === 0 ? (
                    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {tx("No historical decisions available.")}</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={s.coinholderAllGrantsTracking.byDecision.map((row) => ({ ...row, name: tx(row.name) }))}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={78}
                          paddingAngle={2}
                        >
                          {s.coinholderAllGrantsTracking.byDecision.map(
                            (_, i) => (
                              <Cell
                                key={i}
                                fill={PIE_COLORS[i % PIE_COLORS.length]!}
                              />
                            )
                          )}
                        </Pie>
                        <Tooltip contentStyle={TT} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="treasury" className="space-y-8">
            <p className="text-xs text-muted-foreground">
              <span className="text-foreground">{tx(s.zcg.status ?? "—")}</span>
              {tx(" · ZCG block ")}
              <span className="font-mono">{formatSpreadsheetValue(s.zcg.blockHeight, uiLocale) ?? "—"}</span>
              {tx(" · Coinholder block ")}
              <span className="font-mono">{formatSpreadsheetValue(s.coinholder.blockHeight, uiLocale) ?? "—"}</span>
              {" · "}
              {formatSpreadsheetValue(s.zcg.zecUsdPriceDisplay ?? s.coinholder.zecUsdPriceDisplay, uiLocale)}
            </p>
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <SectionTitle>{tx("Zcash Community Grants")}</SectionTitle>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Metric
                    label={tx("Current ZEC balance")}
                    value={formatSpreadsheetValue(s.zcg.metrics["Current ZEC balance:"], uiLocale)}
                  />
                  <Metric
                    label={tx("USD value of current holdings")}
                    value={formatSpreadsheetValue(s.zcg.metrics["USD value of current holdings:"], uiLocale)}
                  />
                  <Metric
                    label={tx("USD available (after liabilities)")}
                    value={
                      formatSpreadsheetValue(s.zcg.metrics["USD value available current holdings:"], uiLocale)
                    }
                  />
                  <Metric
                    label={tx("Future grant liabilities (USD)")}
                    value={
                      formatSpreadsheetValue(s.zcg.metrics["Future grant liabilities (total in USD):"], uiLocale)
                    }
                  />
                  <Metric
                    label={tx("Total ZEC accrued to date")}
                    value={formatSpreadsheetValue(s.zcg.metrics["Total ZEC accrued to date:"], uiLocale)}
                  />
                  <Metric
                    label={tx("Total ZEC outflow")}
                    value={formatSpreadsheetValue(s.zcg.metrics["Total ZEC outflow:"], uiLocale)}
                  />
                  <Metric
                    label={tx("Total USD outflow")}
                    value={formatSpreadsheetValue(s.zcg.metrics["Total USD outflow:"], uiLocale)}
                  />
                  <Metric
                    label={tx("USD reserves (hedging)")}
                    value={formatSpreadsheetValue(s.zcg.metrics["USD reserves:"], uiLocale)}
                  />
                </div>
              </div>
              <div>
                <SectionTitle>{tx("Coinholder Grants")}</SectionTitle>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Metric
                    label={tx("Current ZEC balance")}
                    value={formatSpreadsheetValue(s.coinholder.metrics["Current ZEC balance:"], uiLocale)}
                  />
                  <Metric
                    label={tx("USD value of current ZEC")}
                    value={
                      formatSpreadsheetValue(s.coinholder.metrics["USD value of current ZEC balance:"], uiLocale)
                    }
                  />
                  <Metric
                    label={tx("USD available (after liabilities)")}
                    value={
                      formatSpreadsheetValue(s.coinholder.metrics[
                        "USD value available current holdings:"
                      ], uiLocale)
                    }
                  />
                  <Metric
                    label={tx("Future grant liabilities (USD)")}
                    value={
                      formatSpreadsheetValue(s.coinholder.metrics[
                        "Future grant liabilities (total in USD):"
                      ], uiLocale)
                    }
                  />
                  <Metric
                    label={tx("Total ZEC accrued to date")}
                    value={
                      formatSpreadsheetValue(s.coinholder.metrics["Total ZEC accrued to date:"], uiLocale)
                    }
                  />
                  <Metric
                    label={tx("Total ZEC paid to recipients")}
                    value={
                      formatSpreadsheetValue(s.coinholder.metrics["Total ZEC paid to grant recipients:"], uiLocale)
                    }
                  />
                </div>
              </div>
            </div>
            <div>
              <SectionTitle
                hint={tx("Scenario comparison across market price assumptions (values in millions USD).")}
              >
                {tx("Treasury vs alternate ZEC/USD prices")}</SectionTitle>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scenarioChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                    <XAxis dataKey="priceLabel" tick={AXIS} axisLine={false} tickLine={false} />
                    <YAxis tick={AXIS} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={TT} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line
                      type="monotone"
                      dataKey="zcgCurrentUsdM"
                      name={tx("ZCG current assets")}
                      stroke="hsl(40, 90%, 56%)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="zcgWithReceivableUsdM"
                      name={tx("ZCG + receivables (3rd fund)")}
                      stroke="hsl(173, 58%, 45%)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="coinholderUsdM"
                      name={tx("Coinholder current assets")}
                      stroke="hsl(280, 65%, 60%)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="zcg-ops" className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/40">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">{tx("ZCG Grants — top categories by milestone USD")}</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={s.zcgGrants.byCategory.slice(0, 10).map((row) => ({ ...row, name: tx(row.name) }))}
                      margin={{ left: 8, right: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                      <XAxis type="number" tick={AXIS} tickFormatter={(v) => `$${(v / 1e6).toFixed(1)}M`} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={120}
                        tick={AXIS}
                        tickFormatter={(v) =>
                          String(v).length > 16 ? `${String(v).slice(0, 16)}…` : String(v)
                        }
                      />
                      <Tooltip contentStyle={TT} formatter={(v: number) => `$${v.toLocaleString(uiLocale)}`} />
                      <Bar dataKey="amountUsd" fill="hsl(40, 90%, 50%)" radius={[0, 4, 4, 0]} name={tx("USD")} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">{tx("Top projects by ZEC disbursed (milestones)")}</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={s.zcgGrants.topProjectsByZec}
                      margin={{ left: 8, right: 16 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                      <XAxis type="number" tick={AXIS} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={110}
                        tick={AXIS}
                        tickFormatter={(v) =>
                          String(v).length > 14 ? `${String(v).slice(0, 14)}…` : String(v)
                        }
                      />
                      <Tooltip contentStyle={TT} />
                      <Bar dataKey="zec" fill="hsl(210, 70%, 50%)" radius={[0, 4, 4, 0]} name={tx("ZEC")} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/40">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">
                    {tx("IC payouts — ZEC by category (")}{s.icPayouts.totals.sumZec} {tx(" ZEC total)")}</CardTitle>
                </CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={s.icPayouts.byCategory.slice(0, 10).map((row) => ({ ...row, name: tx(row.name) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                      <XAxis dataKey="name" tick={AXIS} interval={0} angle={-25} textAnchor="end" height={70} />
                      <YAxis tick={AXIS} />
                      <Tooltip contentStyle={TT} />
                      <Bar dataKey="zec" fill="hsl(173, 58%, 42%)" radius={[4, 4, 0, 0]} name={tx("ZEC")} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">{tx("Liquidity — ZEC per transfer")}</CardTitle>
                </CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={s.liquidity.transfers
                        .filter((t) => (t.zecTransferred ?? 0) > 0)
                        .slice(0, 8)}
                      margin={{ left: 4, right: 12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                      <XAxis type="number" tick={AXIS} />
                      <YAxis type="category" dataKey="project" width={100} tick={AXIS} />
                      <Tooltip contentStyle={TT} />
                      <Bar dataKey="zecTransferred" fill="hsl(300, 45%, 55%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <SectionTitle hint={tx("Wallet performance indicators")}>{tx("Liquidity KPIs")}</SectionTitle>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {s.liquidity.kpis.map((k) => (
                    <Metric key={k.label + k.value} label={tx(k.label)} value={k.value} />
                  ))}
                </div>
              </div>
              <div>
                <SectionTitle>{tx("ZCG 2026 discretionary budget")}</SectionTitle>
                <div className="mb-3 grid grid-cols-3 gap-2">
                  <Metric
                    label={tx("Annual (USD)")}
                    value={
                      s.discBudget2026.annualBudgetUsd != null
                        ? `$${Math.round(s.discBudget2026.annualBudgetUsd).toLocaleString(uiLocale)}`
                        : undefined
                    }
                  />
                  <Metric
                    label={tx("Spent (USD)")}
                    value={
                      s.discBudget2026.spentUsd != null
                        ? `$${Math.round(s.discBudget2026.spentUsd).toLocaleString(uiLocale)}`
                        : undefined
                    }
                  />
                  <Metric
                    label={tx("Remaining (USD)")}
                    value={
                      s.discBudget2026.remainingUsd != null
                        ? `$${Math.round(s.discBudget2026.remainingUsd).toLocaleString(uiLocale)}`
                        : undefined
                    }
                  />
                </div>
                {discSpendRatio != null && (
                  <div className="mb-3 h-3 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${discSpendRatio}%` }}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {discSpendRatio}{tx("% of annual USD budget spent (sheet figures)")}</p>
                  </div>
                )}
                <div className="max-h-56 overflow-auto rounded-md border border-border/40 text-xs">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-secondary/80">
                      <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="p-2 font-medium">{tx("Date")}</th>
                        <th className="p-2 font-medium">{tx("Recipient")}</th>
                        <th className="p-2 font-medium text-right">{tx("USD")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.discBudget2026.lines.map((line, i) => (
                        <tr key={i} className="border-b border-border/30">
                          <td className="p-2 font-mono text-[11px]">{tx(line.date)}</td>
                          <td className="p-2">{tx(line.recipient)}</td>
                          <td className="p-2 text-right font-mono">
                            {tx(line.usd != null
                              ? `$${Math.round(line.usd).toLocaleString(uiLocale)}`
                              : "—")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div>
              <SectionTitle hint={tx("Current stipend payment history")}>{tx("Committee stipend payouts")}</SectionTitle>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <Metric
                  label={tx("Payments")}
                  value={String(s.stipend.totals.lines)}
                />
                <Metric
                  label={tx("Sum USD")}
                  value={`$${s.stipend.totals.sumUsd.toLocaleString(uiLocale)}`}
                />
                <Metric
                  label={tx("Sum ZEC")}
                  value={String(s.stipend.totals.sumZec)}
                />
              </div>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={s.stipend.byRecipient.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                    <XAxis dataKey="name" tick={AXIS} interval={0} angle={-20} textAnchor="end" height={72} />
                    <YAxis tick={AXIS} tickFormatter={(v) => `$${v >= 1000 ? `${v / 1000}k` : v}`} />
                    <Tooltip contentStyle={TT} />
                    <Bar dataKey="usd" fill="hsl(35, 85%, 48%)" radius={[4, 4, 0, 0]} name={tx("USD")} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="coinholder" className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/40">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">{tx("Coinholder proposal status")}</CardTitle>
                </CardHeader>
                <CardContent className="h-[240px]">
                  {s.coinholderGrants.byStatus.length === 0 ? (
                    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      {tx("No proposal data available.")}</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={s.coinholderGrants.byStatus.map((row) => ({ ...row, name: tx(row.name) }))}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={85}
                          paddingAngle={2}
                        >
                          {s.coinholderGrants.byStatus.map((_, i) => (
                            <Cell
                              key={i}
                              fill={PIE_COLORS[i % PIE_COLORS.length]!}
                            />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={TT} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">{tx("Coinholder Grants — USD by category")}</CardTitle>
                </CardHeader>
                <CardContent className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={s.coinholderGrants.byCategory.map((row) => ({ ...row, name: tx(row.name) }))}
                      margin={{ left: 4, right: 12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                      <XAxis type="number" tick={AXIS} />
                      <YAxis type="category" dataKey="name" width={100} tick={AXIS} />
                      <Tooltip contentStyle={TT} formatter={(v: number) => `$${v.toLocaleString(uiLocale)}`} />
                      <Bar dataKey="amountUsd" fill="hsl(280, 55%, 55%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <SectionTitle hint={tx("Top recipients by total disbursement")}>
              {tx("Top recipients (Coinholder distribution)")}</SectionTitle>
            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={s.coinholderFundsDistribution.topRecipients}
                  margin={{ left: 4, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                  <XAxis type="number" tick={AXIS} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" width={130} tick={AXIS} />
                  <Tooltip contentStyle={TT} formatter={(v: number) => `$${v.toLocaleString(uiLocale)}`} />
                  <Bar dataKey="paidUsd" fill="hsl(265, 60%, 52%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="registers" className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/40">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">
                    {tx("ZCG committee outcomes (")}{s.zcgAllGrantsTracking.totalRows}{" "}
                    {tx("proposals reviewed)")}</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={s.zcgAllGrantsTracking.byStatus.slice(0, 12).map((row) => ({ ...row, name: tx(row.name) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                      <XAxis dataKey="name" tick={AXIS} interval={0} angle={-22} textAnchor="end" height={80} />
                      <YAxis tick={AXIS} allowDecimals={false} />
                      <Tooltip contentStyle={TT} />
                      <Bar dataKey="count" fill="hsl(210, 70%, 52%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">
                    {tx("Coinholder decisions (")}{s.coinholderAllGrantsTracking.totalRows} {tx(" proposals reviewed)")}</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={s.coinholderAllGrantsTracking.byDecision.map((row) => ({ ...row, name: tx(row.name) }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                      <XAxis dataKey="name" tick={AXIS} interval={0} angle={-18} textAnchor="end" height={70} />
                      <YAxis tick={AXIS} allowDecimals={false} />
                      <Tooltip contentStyle={TT} />
                      <Bar dataKey="count" fill="hsl(280, 55%, 50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <SectionTitle hint={tx("Portfolio allocation by funding category (USD)")}>
              {tx("ZCG allocation by funding category")}</SectionTitle>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={s.zcgFundsDistribution.bySideClassification.slice(0, 14).map((row) => ({ ...row, name: tx(row.name) }))}
                  margin={{ left: 4, right: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                  <XAxis type="number" tick={AXIS} tickFormatter={(v) => `$${(v / 1e6).toFixed(2)}M`} />
                  <YAxis type="category" dataKey="name" width={130} tick={AXIS} />
                  <Tooltip contentStyle={TT} formatter={(v: number) => `$${v.toLocaleString(uiLocale)}`} />
                  <Bar dataKey="usd" fill="hsl(40, 85%, 48%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <SectionTitle hint={tx("Largest recipients by total disbursement to date")}>
              {tx("ZCG top recipients (paid out)")}</SectionTitle>
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={s.zcgFundsDistribution.topRecipients}
                  margin={{ left: 4, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                  <XAxis type="number" tick={AXIS} tickFormatter={(v) => `$${(v / 1e6).toFixed(2)}M`} />
                  <YAxis type="category" dataKey="name" width={120} tick={AXIS} />
                  <Tooltip contentStyle={TT} formatter={(v: number) => `$${v.toLocaleString(uiLocale)}`} />
                  <Bar dataKey="paidUsd" fill="hsl(173, 50%, 42%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="reference" className="space-y-6">
            <SectionTitle hint={tx("Reference market and treasury inputs used in calculations")}>
              {tx("Model inputs snapshot")}</SectionTitle>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(s.inputs.metrics)
                .filter(([k, v]) => k && v && !k.startsWith('"'))
                .slice(0, 24)
                .map(([k, v]) => (
                  <Metric
                    key={k}
                    label={tx(k.replace(/:\s*$/, "").trim())}
                    value={formatSpreadsheetValue(v, uiLocale)}
                  />
                ))}
            </div>
            {(s.inputs.lockboxSecondFundZec || s.inputs.lockboxThirdFundZec) && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Metric
                  label={tx("Lockbox ZEC accrued (2nd dev fund / ZIP 1015)")}
                  value={s.inputs.lockboxSecondFundZec ?? undefined}
                />
                <Metric
                  label={tx("Lockbox ZEC to accrue (3rd dev fund / ZIP 1016)")}
                  value={s.inputs.lockboxThirdFundZec ?? undefined}
                />
              </div>
            )}
            {lockboxBarData && lockboxBarData.rows.length > 0 ? (
              <div>
                <SectionTitle hint={tx("USD value of lockbox ZEC at spot, 2×, and 3× the sheet ZEC/USD (millions USD)")}>
                  {tx("Lockbox USD scenarios")}</SectionTitle>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lockboxBarData.rows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                      <XAxis dataKey="scenario" tick={AXIS} />
                      <YAxis
                        tick={AXIS}
                        label={{
                          value: tx("USD (M)"),
                          angle: -90,
                          position: "insideLeft",
                          fill: AXIS.fill,
                          fontSize: 11,
                        }}
                      />
                      <Tooltip contentStyle={TT} />
                      <Legend />
                      {lockboxBarData.keys.map((k, i) => (
                        <Bar
                          key={k}
                          dataKey={k}
                          fill={PIE_COLORS[i % PIE_COLORS.length]}
                          radius={[4, 4, 0, 0]}
                          name={tx(k.length > 28 ? `${k.slice(0, 28)}…` : k)}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : null}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
