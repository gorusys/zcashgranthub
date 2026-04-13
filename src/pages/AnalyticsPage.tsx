import { useMemo, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGrants } from "@/hooks/useGrants";
import { useZcgPublicSpreadsheet } from "@/hooks/useZcgPublicSpreadsheet";
import { ZCG_PUBLIC_SPREADSHEET_URL } from "@/lib/zcgPublicSpreadsheet";
import { ZcgWorkbookAnalytics } from "@/components/analytics/ZcgWorkbookAnalytics";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { GrantCategory } from "@/data/mockData";
import { AlertCircle } from "lucide-react";

const CHART_TOOLTIP_STYLE = {
  background: "hsl(220, 30%, 12%)",
  border: "1px solid hsl(220, 20%, 18%)",
  borderRadius: 8,
  color: "#fff",
};

const AXIS_TICK = { fill: "hsl(215, 20%, 55%)", fontSize: 12 };

const CATEGORY_COLORS: Record<string, string> = {
  Infrastructure: "#F4B728",
  Education: "#3B82F6",
  Community: "#10B981",
  "Research & Development": "#14B8A6",
  Integration: "#A855F7",
  Wallets: "#F97316",
  Media: "#EC4899",
  "Non-Wallet Applications": "#06B6D4",
  "Zcash Protocol Extension": "#EF4444",
  "Dedicated Resource": "#64748B",
  "Event Sponsorships": "#EAB308",
};

function Counter({ target, prefix = "" }: { target: number; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setStarted(true);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started || target === 0) return;
    const steps = 50;
    const inc = target / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= target) {
        setCount(target);
        clearInterval(t);
      } else {
        setCount(Math.floor(cur));
      }
    }, 30);
    return () => clearInterval(t);
  }, [started, target]);

  return (
    <div ref={ref} className="text-2xl font-bold text-primary sm:text-3xl">
      {prefix}
      {target >= 1_000_000
        ? `${(count / 1_000_000).toFixed(1)}M`
        : count.toLocaleString()}
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: grants = [], isLoading, isError, error } = useGrants();
  const {
    data: sheet,
    isLoading: sheetLoading,
    isError: sheetError,
    error: sheetErr,
  } = useZcgPublicSpreadsheet();

  // Compute stats from real data
  const stats = useMemo(() => {
    const totalGrants = grants.length;
    const totalDisbursed = grants.reduce((s, g) => s + g.amountPaid, 0);
    const activeGrantees = grants.filter((g) =>
      ["ACTIVE", "APPROVED"].includes(g.status)
    ).length;
    const uniqueCategories = new Set(grants.map((g) => g.category)).size;

    return { totalGrants, totalDisbursed, activeGrantees, uniqueCategories };
  }, [grants]);

  // Grants submitted per month (last 12 months)
  const monthlyData = useMemo(() => {
    const buckets: Record<string, number> = {};
    const now = new Date();

    // Build last 12 months labels
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      buckets[key] = 0;
    }

    for (const grant of grants) {
      const d = new Date(grant.submittedDate);
      const key = d.toLocaleString("en-US", { month: "short", year: "2-digit" });
      if (key in buckets) buckets[key]++;
    }

    return Object.entries(buckets).map(([month, grants]) => ({
      month,
      grants,
    }));
  }, [grants]);

  // Category breakdown
  const categoryData = useMemo(() => {
    const counts: Partial<Record<GrantCategory, number>> = {};
    for (const grant of grants) {
      counts[grant.category] = (counts[grant.category] ?? 0) + 1;
    }
    return Object.entries(counts)
      .map(([name, value]) => ({
        name,
        value: value as number,
        color: CATEGORY_COLORS[name] ?? "#64748B",
      }))
      .sort((a, b) => b.value - a.value);
  }, [grants]);

  // Top grantees by total requested amount
  const topGrantees = useMemo(() => {
    const map: Record<string, { total: number; grants: number }> = {};
    for (const grant of grants) {
      if (!map[grant.applicant]) map[grant.applicant] = { total: 0, grants: 0 };
      map[grant.applicant].total += grant.amount;
      map[grant.applicant].grants += 1;
    }
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [grants]);

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-400" />
        <h1 className="text-xl font-bold text-foreground">
          Could not load analytics
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {(error as Error)?.message ?? "Failed to fetch grants from GitHub."}
        </p>
      </div>
    );
  }

  const skeletonClass = isLoading ? "animate-pulse" : "";

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">Analytics</h1>
      <p className="mb-6 text-sm text-muted-foreground sm:mb-8 sm:text-base">
        Application and category metrics from GitHub Issues, plus official ZCG /
        Coinholder treasury figures from the public{" "}
        <a
          href={ZCG_PUBLIC_SPREADSHEET_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline-offset-4 hover:underline"
        >
          Zcash Community Grants + Coinholder Grants dashboard sheet
        </a>
      </p>

      <ZcgWorkbookAnalytics
        sheet={sheet}
        loading={sheetLoading}
        error={sheetError ? sheetErr ?? null : null}
      />

      <h2 className="mb-4 mt-2 text-lg font-semibold text-foreground">
        GitHub grant applications
      </h2>
      <p className="mb-6 text-xs text-muted-foreground sm:text-sm">
        Issue-based pipeline for applications in connected repos — independent
        of the treasury workbook above.
      </p>

      {/* Stat cards */}
      <div className={`mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4 ${skeletonClass}`}>
        {[
          { label: "Total Grant Applications", value: stats.totalGrants },
          {
            label: "Total USD Requested",
            value: grants.reduce((s, g) => s + g.amount, 0),
            prefix: "$",
          },
          { label: "Active Grantees", value: stats.activeGrantees },
          { label: "Categories Funded", value: stats.uniqueCategories },
        ].map((s) => (
          <Card key={s.label} className="border-border/50 bg-card">
            <CardContent className="p-5 text-center">
              {isLoading ? (
                <div className="mx-auto h-9 w-20 rounded bg-secondary" />
              ) : (
                <Counter target={s.value} prefix={s.prefix ?? ""} />
              )}
              <div className="mt-1 text-xs text-muted-foreground">
                {s.label}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Applications per month */}
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">
              Applications per Month (last 12 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 animate-pulse rounded bg-secondary" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyData}>
                  <XAxis
                    dataKey="month"
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={AXIS_TICK}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar
                    dataKey="grants"
                    fill="hsl(40, 90%, 56%)"
                    radius={[4, 4, 0, 0]}
                    name="Applications"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category donut */}
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">Applications by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 animate-pulse rounded bg-secondary" />
            ) : categoryData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1.5">
                  {categoryData.map((c) => (
                    <div
                      key={c.name}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: c.color }}
                      />
                      {c.name} ({c.value})
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No data yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top applicants by requested amount */}
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-base">
              Top Applicants by Total Requested
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 animate-pulse rounded bg-secondary"
                  />
                ))}
              </div>
            ) : topGrantees.length > 0 ? (
              <div className="overflow-x-auto">
              <table className="w-full min-w-[280px] text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Applicant</th>
                    <th className="pb-2 text-right font-medium">Requested</th>
                    <th className="pb-2 text-right font-medium">Apps</th>
                  </tr>
                </thead>
                <tbody>
                  {topGrantees.map((g) => (
                    <tr
                      key={g.name}
                      className="border-b border-border/50 last:border-0"
                    >
                      <td className="py-2 text-foreground">
                        <a
                          href={`https://github.com/${g.name}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-primary hover:underline"
                        >
                          @{g.name}
                        </a>
                      </td>
                      <td className="py-2 text-right font-medium text-primary">
                        ${g.total.toLocaleString()}
                      </td>
                      <td className="py-2 text-right text-muted-foreground">
                        {g.grants}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No data yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
