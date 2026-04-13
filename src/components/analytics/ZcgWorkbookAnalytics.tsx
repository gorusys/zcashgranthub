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
  if (!value) return null;
  return (
    <div className="rounded-lg border border-border/40 bg-secondary/15 px-3 py-2.5 transition-colors hover:bg-secondary/25">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-semibold text-foreground sm:text-[15px]">
        {value}
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
  return (
    <div className="mb-3">
      <h3 className="text-sm font-semibold text-foreground">{children}</h3>
      {hint ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
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
              Could not load the public spreadsheet
            </p>
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
              Community grants analytics
            </CardTitle>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
              Figures reflect the sheet at{" "}
              <span className="font-mono text-foreground">
                {new Date(s.fetchedAt).toLocaleString()}
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
            Open sheet
            <ExternalLink className="h-3.5 w-3.5 opacity-70" />
          </a>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="mb-4 flex h-auto min-h-10 w-full flex-wrap justify-start gap-1 bg-muted/80 p-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="treasury" className="text-xs sm:text-sm">
              Treasury
            </TabsTrigger>
            <TabsTrigger value="zcg-ops" className="text-xs sm:text-sm">
              ZCG operations
            </TabsTrigger>
            <TabsTrigger value="coinholder" className="text-xs sm:text-sm">
              Coinholder
            </TabsTrigger>
            <TabsTrigger value="registers" className="text-xs sm:text-sm">
              Grant registers
            </TabsTrigger>
            <TabsTrigger value="reference" className="text-xs sm:text-sm">
              Inputs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="ZCG milestone payments"
                value={String(s.zcgGrants.totals.milestoneRows)}
              />
              <Metric
                label="ZEC disbursed (sum milestones)"
                value={`${s.zcgGrants.totals.sumZec.toLocaleString()} ZEC`}
              />
              <Metric
                label="Independent contractor payouts"
                value={String(s.icPayouts.totals.lines)}
              />
              <Metric
                label="Coinholder funded proposals"
                value={String(s.coinholderGrants.totals.rows)}
              />
              <Metric
                label="Liquidity transfers"
                value={String(s.liquidity.transfers.length)}
              />
              <Metric
                label="2026 Disc. budget spent / annual"
                value={
                  s.discBudget2026.spentUsd != null &&
                  s.discBudget2026.annualBudgetUsd != null
                    ? `$${Math.round(s.discBudget2026.spentUsd).toLocaleString()} / $${Math.round(s.discBudget2026.annualBudgetUsd).toLocaleString()}`
                    : undefined
                }
              />
              <Metric
                label="Committee stipend payments"
                value={String(s.stipend.totals.lines)}
              />
              <Metric
                label="ZCG proposal history"
                value={String(s.zcgAllGrantsTracking.totalRows)}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="border-border/40 bg-secondary/10">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">ZCG grant status mix</CardTitle>
                </CardHeader>
                <CardContent className="h-[220px]">
                  {s.zcgGrants.byStatus.length === 0 ? (
                    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      Status information unavailable.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={s.zcgGrants.byStatus.slice(0, 8)}
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
                    Coinholder decision mix
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[220px]">
                  {s.coinholderAllGrantsTracking.byDecision.length === 0 ? (
                    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No historical decisions available.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={s.coinholderAllGrantsTracking.byDecision}
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
              <span className="text-foreground">{s.zcg.status ?? "—"}</span>
              {" · ZCG block "}
              <span className="font-mono">{s.zcg.blockHeight ?? "—"}</span>
              {" · Coinholder block "}
              <span className="font-mono">{s.coinholder.blockHeight ?? "—"}</span>
              {" · "}
              {s.zcg.zecUsdPriceDisplay ?? s.coinholder.zecUsdPriceDisplay}
            </p>
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <SectionTitle>Zcash Community Grants</SectionTitle>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Metric
                    label="Current ZEC balance"
                    value={s.zcg.metrics["Current ZEC balance:"]}
                  />
                  <Metric
                    label="USD value of current holdings"
                    value={s.zcg.metrics["USD value of current holdings:"]}
                  />
                  <Metric
                    label="USD available (after liabilities)"
                    value={
                      s.zcg.metrics["USD value available current holdings:"]
                    }
                  />
                  <Metric
                    label="Future grant liabilities (USD)"
                    value={
                      s.zcg.metrics["Future grant liabilities (total in USD):"]
                    }
                  />
                  <Metric
                    label="Total ZEC accrued to date"
                    value={s.zcg.metrics["Total ZEC accrued to date:"]}
                  />
                  <Metric
                    label="Total ZEC outflow"
                    value={s.zcg.metrics["Total ZEC outflow:"]}
                  />
                  <Metric
                    label="Total USD outflow"
                    value={s.zcg.metrics["Total USD outflow:"]}
                  />
                  <Metric
                    label="USD reserves (hedging)"
                    value={s.zcg.metrics["USD reserves:"]}
                  />
                </div>
              </div>
              <div>
                <SectionTitle>Coinholder Grants</SectionTitle>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Metric
                    label="Current ZEC balance"
                    value={s.coinholder.metrics["Current ZEC balance:"]}
                  />
                  <Metric
                    label="USD value of current ZEC"
                    value={
                      s.coinholder.metrics["USD value of current ZEC balance:"]
                    }
                  />
                  <Metric
                    label="USD available (after liabilities)"
                    value={
                      s.coinholder.metrics[
                        "USD value available current holdings:"
                      ]
                    }
                  />
                  <Metric
                    label="Future grant liabilities (USD)"
                    value={
                      s.coinholder.metrics[
                        "Future grant liabilities (total in USD):"
                      ]
                    }
                  />
                  <Metric
                    label="Total ZEC accrued to date"
                    value={
                      s.coinholder.metrics["Total ZEC accrued to date:"]
                    }
                  />
                  <Metric
                    label="Total ZEC paid to recipients"
                    value={
                      s.coinholder.metrics["Total ZEC paid to grant recipients:"]
                    }
                  />
                </div>
              </div>
            </div>
            <div>
              <SectionTitle
                hint="Scenario comparison across market price assumptions (values in millions USD)."
              >
                Treasury vs alternate ZEC/USD prices
              </SectionTitle>
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
                      name="ZCG current assets"
                      stroke="hsl(40, 90%, 56%)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="zcgWithReceivableUsdM"
                      name="ZCG + receivables (3rd fund)"
                      stroke="hsl(173, 58%, 45%)"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="coinholderUsdM"
                      name="Coinholder current assets"
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
                  <CardTitle className="text-sm">ZCG Grants — top categories by milestone USD</CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={s.zcgGrants.byCategory.slice(0, 10)}
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
                      <Tooltip contentStyle={TT} formatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Bar dataKey="amountUsd" fill="hsl(40, 90%, 50%)" radius={[0, 4, 4, 0]} name="USD" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Top projects by ZEC disbursed (milestones)</CardTitle>
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
                      <Bar dataKey="zec" fill="hsl(210, 70%, 50%)" radius={[0, 4, 4, 0]} name="ZEC" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/40">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">
                    IC payouts — ZEC by category ({s.icPayouts.totals.sumZec} ZEC total)
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={s.icPayouts.byCategory.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                      <XAxis dataKey="name" tick={AXIS} interval={0} angle={-25} textAnchor="end" height={70} />
                      <YAxis tick={AXIS} />
                      <Tooltip contentStyle={TT} />
                      <Bar dataKey="zec" fill="hsl(173, 58%, 42%)" radius={[4, 4, 0, 0]} name="ZEC" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="border-border/40">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Liquidity — ZEC per transfer</CardTitle>
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
                <SectionTitle hint="Wallet performance indicators">Liquidity KPIs</SectionTitle>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {s.liquidity.kpis.map((k) => (
                    <Metric key={k.label + k.value} label={k.label} value={k.value} />
                  ))}
                </div>
              </div>
              <div>
                <SectionTitle>ZCG 2026 discretionary budget</SectionTitle>
                <div className="mb-3 grid grid-cols-3 gap-2">
                  <Metric
                    label="Annual (USD)"
                    value={
                      s.discBudget2026.annualBudgetUsd != null
                        ? `$${Math.round(s.discBudget2026.annualBudgetUsd).toLocaleString()}`
                        : undefined
                    }
                  />
                  <Metric
                    label="Spent (USD)"
                    value={
                      s.discBudget2026.spentUsd != null
                        ? `$${Math.round(s.discBudget2026.spentUsd).toLocaleString()}`
                        : undefined
                    }
                  />
                  <Metric
                    label="Remaining (USD)"
                    value={
                      s.discBudget2026.remainingUsd != null
                        ? `$${Math.round(s.discBudget2026.remainingUsd).toLocaleString()}`
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
                      {discSpendRatio}% of annual USD budget spent (sheet figures)
                    </p>
                  </div>
                )}
                <div className="max-h-56 overflow-auto rounded-md border border-border/40 text-xs">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-secondary/80">
                      <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="p-2 font-medium">Date</th>
                        <th className="p-2 font-medium">Recipient</th>
                        <th className="p-2 font-medium text-right">USD</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.discBudget2026.lines.map((line, i) => (
                        <tr key={i} className="border-b border-border/30">
                          <td className="p-2 font-mono text-[11px]">{line.date}</td>
                          <td className="p-2">{line.recipient}</td>
                          <td className="p-2 text-right font-mono">
                            {line.usd != null
                              ? `$${Math.round(line.usd).toLocaleString()}`
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div>
              <SectionTitle hint="Current stipend payment history">Committee stipend payouts</SectionTitle>
              <div className="mb-4 grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Payments"
                  value={String(s.stipend.totals.lines)}
                />
                <Metric
                  label="Sum USD"
                  value={`$${s.stipend.totals.sumUsd.toLocaleString()}`}
                />
                <Metric
                  label="Sum ZEC"
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
                    <Bar dataKey="usd" fill="hsl(35, 85%, 48%)" radius={[4, 4, 0, 0]} name="USD" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="coinholder" className="space-y-8">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="border-border/40">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Coinholder proposal status</CardTitle>
                </CardHeader>
                <CardContent className="h-[240px]">
                  {s.coinholderGrants.byStatus.length === 0 ? (
                    <p className="flex h-full items-center justify-center text-sm text-muted-foreground">
                      No proposal data available.
                    </p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={s.coinholderGrants.byStatus}
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
                  <CardTitle className="text-sm">Coinholder Grants — USD by category</CardTitle>
                </CardHeader>
                <CardContent className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={s.coinholderGrants.byCategory}
                      margin={{ left: 4, right: 12 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                      <XAxis type="number" tick={AXIS} />
                      <YAxis type="category" dataKey="name" width={100} tick={AXIS} />
                      <Tooltip contentStyle={TT} formatter={(v: number) => `$${v.toLocaleString()}`} />
                      <Bar dataKey="amountUsd" fill="hsl(280, 55%, 55%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <SectionTitle hint="Top recipients by total disbursement">
              Top recipients (Coinholder distribution)
            </SectionTitle>
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
                  <Tooltip contentStyle={TT} formatter={(v: number) => `$${v.toLocaleString()}`} />
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
                    ZCG committee outcomes ({s.zcgAllGrantsTracking.totalRows}{" "}
                    proposals reviewed)
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={s.zcgAllGrantsTracking.byStatus.slice(0, 12)}>
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
                    Coinholder decisions (
                    {s.coinholderAllGrantsTracking.totalRows} proposals reviewed)
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={s.coinholderAllGrantsTracking.byDecision}>
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
            <SectionTitle hint="Portfolio allocation by funding category (USD)">
              ZCG allocation by funding category
            </SectionTitle>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={s.zcgFundsDistribution.bySideClassification.slice(0, 14)}
                  margin={{ left: 4, right: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                  <XAxis type="number" tick={AXIS} tickFormatter={(v) => `$${(v / 1e6).toFixed(2)}M`} />
                  <YAxis type="category" dataKey="name" width={130} tick={AXIS} />
                  <Tooltip contentStyle={TT} formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Bar dataKey="usd" fill="hsl(40, 85%, 48%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <SectionTitle hint="Largest recipients by total disbursement to date">
              ZCG top recipients (paid out)
            </SectionTitle>
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
                  <Tooltip contentStyle={TT} formatter={(v: number) => `$${v.toLocaleString()}`} />
                  <Bar dataKey="paidUsd" fill="hsl(173, 50%, 42%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="reference" className="space-y-6">
            <SectionTitle hint="Reference market and treasury inputs used in calculations">
              Model inputs snapshot
            </SectionTitle>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(s.inputs.metrics)
                .filter(([k, v]) => k && v && !k.startsWith('"'))
                .slice(0, 24)
                .map(([k, v]) => (
                  <Metric
                    key={k}
                    label={k.replace(/:\s*$/, "").trim()}
                    value={v}
                  />
                ))}
            </div>
            {(s.inputs.lockboxSecondFundZec || s.inputs.lockboxThirdFundZec) && (
              <div className="grid gap-2 sm:grid-cols-2">
                <Metric
                  label="Lockbox ZEC accrued (2nd dev fund / ZIP 1015)"
                  value={s.inputs.lockboxSecondFundZec ?? undefined}
                />
                <Metric
                  label="Lockbox ZEC to accrue (3rd dev fund / ZIP 1016)"
                  value={s.inputs.lockboxThirdFundZec ?? undefined}
                />
              </div>
            )}
            {lockboxBarData && lockboxBarData.rows.length > 0 ? (
              <div>
                <SectionTitle hint="USD value of lockbox ZEC at spot, 2×, and 3× the sheet ZEC/USD (millions USD)">
                  Lockbox USD scenarios
                </SectionTitle>
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lockboxBarData.rows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 20%, 18%)" />
                      <XAxis dataKey="scenario" tick={AXIS} />
                      <YAxis
                        tick={AXIS}
                        label={{
                          value: "USD (M)",
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
                          name={k.length > 28 ? `${k.slice(0, 28)}…` : k}
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
