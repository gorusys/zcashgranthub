import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { useQuery } from "@tanstack/react-query";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ExternalLink, Layers } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useZecUsdPrice } from "@/hooks/useZecUsdPrice";
import {
  blockSplit,
  dailyFlows,
  estimateTimeOfHeight,
  FEE_BURN_SHARE,
  NSM_REISSUANCE_HEIGHT,
  NU7_HEIGHT,
  simulateRunway,
  THIRD_HALVING_HEIGHT,
  ZAT,
  type ChainRef,
} from "@/lib/fundingStreams";

/** Defaults for the scenario; every one is editable on the page. */
const DEFAULT_TREASURY_ZEC = 91_453; // ZCG operating holdings, OpenZcash, Oct 2026
const DEFAULT_QUARTERLY_SPEND = 1_530_000; // ZCG expenses Q1 2026 (FPF report)
const DEFAULT_EARLY_END = "2027-11-05";

const SOURCES = {
  zip218: "https://zips.z.cash/zip-0218",
  zip1016: "https://zips.z.cash/zip-1016",
  zip259: "https://zips.z.cash/zip-0259",
  openzcash: "https://openzcash.org/zcg",
  forumProposal: "https://forum.zcashcommunity.com/t/58515",
  press:
    "https://theblock.co/news/ecosystems/2026-10-27-zcash-co-founder-proposes-ending-grants-subsidy-citing-125-million-treasury-431847",
};

const zec = (n: number, digits = 2) =>
  n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
const usd = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const date = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
const monthYear = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { year: "numeric", month: "short" });

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xl font-bold tabular-nums text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-foreground">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        min={0}
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function FundingStreamsPage() {
  const { data: tip } = useQuery<ChainRef & { source: string }>({
    queryKey: ["chain-tip"],
    queryFn: async () => {
      const res = await fetch("/api/chain/tip");
      if (!res.ok) throw new Error(`Chain tip failed (${res.status})`);
      return res.json();
    },
    refetchInterval: 60_000,
  });
  const price = useZecUsdPrice();

  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);

  const [treasury, setTreasury] = useState(DEFAULT_TREASURY_ZEC);
  const [spend, setSpend] = useState(DEFAULT_QUARTERLY_SPEND);
  const [priceInput, setPriceInput] = useState<number | null>(null);
  const [earlyEnd, setEarlyEnd] = useState(DEFAULT_EARLY_END);
  const [showTable, setShowTable] = useState(false);
  const zecUsd = priceInput ?? price.usd ?? 0;

  const pre = blockSplit(NU7_HEIGHT - 1);
  const post = blockSplit(NU7_HEIGHT);
  const preDay = dailyFlows(NU7_HEIGHT - 1);
  const postDay = dailyFlows(NU7_HEIGHT);
  const nu7Active = tip ? tip.height >= NU7_HEIGHT : false;
  const current = nu7Active ? postDay : preDay;

  const at = (h: number) => (tip ? estimateTimeOfHeight(h, tip) : null);
  const nu7At = at(NU7_HEIGHT);
  const streamsEndAt = at(THIRD_HALVING_HEIGHT);
  const nsmAt = at(NSM_REISSUANCE_HEIGHT);

  const scenario = useMemo(() => {
    if (now == null || streamsEndAt == null || zecUsd <= 0) return null;
    const earlyEndMs = Date.parse(`${earlyEnd}T00:00:00Z`);
    const base = { treasuryZec: treasury, zecUsd, quarterlySpendUsd: spend, now, streamZecPerDay: postDay.zcgZec };
    const scheduled = simulateRunway({ ...base, streamEndsAt: streamsEndAt });
    const early = simulateRunway({
      ...base,
      streamEndsAt: Number.isFinite(earlyEndMs) ? Math.min(earlyEndMs, streamsEndAt) : streamsEndAt,
    });
    const len = Math.max(scheduled.monthly.length, early.monthly.length);
    const rows = Array.from({ length: len }, (_, i) => ({
      t: (scheduled.monthly[i] ?? early.monthly[i]).t,
      scheduled: scheduled.monthly[i]?.zec ?? 0,
      early: early.monthly[i]?.zec ?? 0,
    })).filter((_, i) => i % 3 === 0 || i === len - 1);
    return { scheduled, early, rows };
  }, [now, streamsEndAt, zecUsd, treasury, spend, earlyEnd, postDay.zcgZec]);

  const runwayText = (depletedAt: number | null) =>
    depletedAt == null ? "lasts 20+ years" : `runs out around ${monthYear(depletedAt)}`;

  return (
    <div className="container mx-auto min-w-0 max-w-5xl px-4 py-6 sm:py-8">
      <Head>
        <title>Funding streams & NU7 · Zcash Grants Hub</title>
        <meta
          name="description"
          content="Where each Zcash block reward goes before and after NU7, when the dev-fund streams end, and a treasury runway scenario for the ZCG funding debate."
        />
      </Head>

      <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground sm:text-3xl">
        <Layers className="h-7 w-7 text-primary" /> Funding streams &amp; NU7
      </h1>
      <p className="mb-6 mt-2 text-sm text-muted-foreground sm:text-base">
        Every block's subsidy is split between miners (80%), Zcash Community Grants (8%) and the
        Coinholder-Controlled Fund (12%). NU7 cuts block time from 75 to 25 seconds and divides
        the per-block subsidy by three, so daily issuance stays the same. All values follow the
        ZIPs; dates are estimates at target block spacing.
      </p>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Chain height"
          value={tip ? tip.height.toLocaleString() : "…"}
          sub={tip?.source === "estimate" ? "Estimated (explorer unavailable)" : "Live, via Blockchair"}
        />
        <Stat
          label={nu7Active ? "NU7 active since" : "NU7 activation"}
          value={nu7At ? date(nu7At) : "…"}
          sub={
            tip && !nu7Active
              ? `${(NU7_HEIGHT - tip.height).toLocaleString()} blocks to go (height ${NU7_HEIGHT.toLocaleString()})`
              : `Height ${NU7_HEIGHT.toLocaleString()}`
          }
        />
        <Stat
          label="Issued per day"
          value={`${zec(current.issuedZec, 0)} ZEC`}
          sub={price.usd ? `≈ ${usd(current.issuedZec * price.usd)}` : undefined}
        />
        <Stat
          label="Grant streams end"
          value={streamsEndAt ? monthYear(streamsEndAt) : "…"}
          sub={`Third halving, height ${THIRD_HALVING_HEIGHT.toLocaleString()}`}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Where each block goes</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead className="text-right">Per block, before NU7</TableHead>
                <TableHead className="text-right">Per block, after NU7</TableHead>
                <TableHead className="text-right">Per day</TableHead>
                <TableHead className="text-right">Per day (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(
                [
                  ["Miners (80%)", pre.minersZat, post.minersZat, postDay.minersZec],
                  ["Zcash Community Grants (8%)", pre.zcgZat, post.zcgZat, postDay.zcgZec],
                  ["Coinholder-Controlled Fund (12%)", pre.coinholderZat, post.coinholderZat, postDay.coinholderZec],
                  ["Total subsidy", pre.subsidyZat, post.subsidyZat, postDay.issuedZec],
                ] as const
              ).map(([label, a, b, day]) => (
                <TableRow key={label} className={label === "Total subsidy" ? "font-medium" : undefined}>
                  <TableCell>{label}</TableCell>
                  <TableCell className="text-right tabular-nums">{zec(a / ZAT, 8)}</TableCell>
                  <TableCell className="text-right tabular-nums">{zec(b / ZAT, 8)}</TableCell>
                  <TableCell className="text-right tabular-nums">{zec(day, 1)} ZEC</TableCell>
                  <TableCell className="text-right tabular-nums">{price.usd ? usd(day * price.usd) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Blocks every {nu7Active ? 25 : 75} s ({zec(current.blocksPerDay, 0)} per day). Transaction
            fees go to miners, except that from NU7 {FEE_BURN_SHARE * 100}% of fees are removed from
            circulation (ZIP 235). Per-block values use ZIP 218's rounding, so three post-NU7 blocks
            pay a few zatoshi less than one pre-NU7 block.
          </p>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">What changes when</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            {[
              [NU7_HEIGHT, nu7At, "NU7", "25-second blocks; subsidy per block ÷ 3; 60% of fees removed from circulation; Sprout funds become unspendable; ZCG and Coinholder streams extended to the new third-halving height."],
              [THIRD_HALVING_HEIGHT, streamsEndAt, "Third halving", "Subsidy halves. The 8% ZCG and 12% Coinholder streams end (ZIP 1016 / ZIP 214 rev. 3) unless a later upgrade changes them."],
              [NSM_REISSUANCE_HEIGHT, nsmAt, "NSM reissuance starts", "The Network Sustainability Mechanism begins paying ZEC removed from circulation back out through block rewards (ZIP 237)."],
            ].map(([h, t, title, body]) => (
              <li key={title as string} className="flex gap-3">
                <div className="w-28 shrink-0 text-xs text-muted-foreground sm:w-36">
                  <div className="font-medium text-foreground">{t ? date(t as number) : "…"}</div>
                  height {(h as number).toLocaleString()}
                </div>
                <div>
                  <div className="font-medium text-foreground">{title as string}</div>
                  <p className="text-muted-foreground">{body as string}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Scenario: ZCG treasury runway</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <p className="text-muted-foreground">
            A{" "}
            <a href={SOURCES.forumProposal} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              forum proposal
            </a>{" "}
            (Oct 26, 2026) would end the 8% ZCG stream at NU8 and send it to the NSM instead;{" "}
            <a href={SOURCES.press} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              press coverage
            </a>{" "}
            attributes a related draft to Sean Bowe. This compares how long ZCG's treasury lasts if
            the stream runs to the third halving versus stopping on a date you choose. It is a
            simple model: constant ZEC price and spending, no new policy. Change any input.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumberField
              id="treasury"
              label="ZCG treasury (ZEC)"
              value={treasury}
              onChange={setTreasury}
              hint="Default: OpenZcash, Oct 2026"
            />
            <NumberField
              id="spend"
              label="Spending per quarter (USD)"
              value={spend}
              onChange={setSpend}
              hint="Default: Q1 2026 ZCG expenses (FPF)"
            />
            <NumberField
              id="price"
              label="ZEC price (USD)"
              value={zecUsd}
              onChange={setPriceInput}
              hint={priceInput == null ? "Live price" : "Your value"}
            />
            <div>
              <label htmlFor="early" className="mb-1 block text-sm font-medium text-foreground">
                Stream stops early on
              </label>
              <Input id="early" type="date" value={earlyEnd} onChange={(e) => setEarlyEnd(e.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">NU8 has no scheduled date</p>
            </div>
          </div>

          {scenario ? (
            <>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  <span className="inline-block h-0.5 w-5 rounded" style={{ background: "var(--viz-series-1)" }} aria-hidden />
                  <span className="text-foreground">
                    Stream continues to the third halving: treasury {runwayText(scenario.scheduled.depletedAt)}.
                  </span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-block h-0.5 w-5 rounded" style={{ background: "var(--viz-series-2)" }} aria-hidden />
                  <span className="text-foreground">
                    Stream stops {date(Date.parse(`${earlyEnd}T00:00:00Z`))}: treasury {runwayText(scenario.early.depletedAt)}.
                  </span>
                </li>
              </ul>
              <p className="text-xs font-medium text-muted-foreground">ZCG treasury balance (ZEC), constant price</p>
              <div className="h-72 w-full" role="img" aria-label="ZCG treasury balance over time under both scenarios">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scenario.rows} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      ticks={scenario.rows.filter((r, i) => i % 8 === 0).map((r) => r.t)}
                      tickFormatter={(t) => new Date(t).getUTCFullYear().toString()}
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      minTickGap={40}
                    />
                    <YAxis
                      tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                    />
                    <Tooltip
                      cursor={{ stroke: "hsl(var(--muted-foreground))", strokeWidth: 1 }}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        color: "hsl(var(--foreground))",
                        fontSize: 12,
                      }}
                      itemStyle={{ color: "hsl(var(--foreground))" }}
                      labelFormatter={(t) => monthYear(Number(t))}
                      formatter={(v: number, name: string) => [
                        `${zec(v, 0)} ZEC`,
                        name === "scheduled" ? "Stream to third halving" : "Stream stops early",
                      ]}
                    />
                    <Line type="monotone" dataKey="scheduled" stroke="var(--viz-series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                    <Line type="monotone" dataKey="early" stroke="var(--viz-series-2)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <Button variant="outline" size="sm" onClick={() => setShowTable(!showTable)} aria-expanded={showTable}>
                {showTable ? "Hide" : "Show"} data table
              </Button>
              {showTable && (
                <div className="max-h-72 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Stream to third halving (ZEC)</TableHead>
                        <TableHead className="text-right">Stream stops early (ZEC)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scenario.rows.map((r) => (
                        <TableRow key={r.t}>
                          <TableCell>{monthYear(r.t)}</TableCell>
                          <TableCell className="text-right tabular-nums">{zec(r.scheduled, 0)}</TableCell>
                          <TableCell className="text-right tabular-nums">{zec(r.early, 0)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            <div className="h-72 animate-pulse rounded-lg bg-muted" />
          )}
          <p className="text-xs text-muted-foreground">
            Not modelled: price changes, investment returns, approved-but-unpaid milestones, and
            the proposal's transfer of the remaining treasury to the NSM. The Coinholder fund (12%)
            is unaffected by the proposal.
          </p>
        </CardContent>
      </Card>

      <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        Sources:
        {[
          ["ZIP 218", SOURCES.zip218],
          ["ZIP 1016", SOURCES.zip1016],
          ["ZIP 259 (NU7)", SOURCES.zip259],
          ["OpenZcash treasury", SOURCES.openzcash],
        ].map(([label, href]) => (
          <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            {label} <ExternalLink className="h-3 w-3" />
          </a>
        ))}
      </p>
    </div>
  );
}
