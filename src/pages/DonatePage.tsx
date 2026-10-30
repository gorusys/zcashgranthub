import { useUi } from "@/i18n/useUi";
import { useEffect, useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import QRCode from "qrcode";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bug,
  Check,
  Code,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Heart,
  MessageSquare,
  QrCode,
  ShieldCheck,
  Vote,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useZecUsdPrice } from "@/hooks/useZecUsdPrice";
import { track } from "@/lib/analytics";
import {
  DEFAULT_DONATION_MEMO,
  DONATION_RECEIVERS,
  DONATION_UNIFIED_ADDRESS,
  HUB_REPO_URL,
  MAX_MEMO_BYTES,
  addressFingerprint,
  buildZip321Uri,
  isValidMainnetUnifiedAddress,
  normalizeZecAmount,
  utf8ByteLength,
} from "@/lib/donate";

const PRESET_AMOUNTS = ["0.1", "0.5", "1", "5"];
const PAYMENT_LABEL = "Zcash Grants Hub";
const ZCASH_WALLETS_URL = "https://z.cash/wallets/";

type QrMode = "request" | "address";

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for browsers without the async clipboard API (or non-secure contexts).
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  }
}

function useCopy() {
  const { text: tx } = useUi();
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!copied) return;
    const id = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(id);
  }, [copied]);

  const copy = async (key: string, text: string, successMessage: string) => {
    if (await copyText(text)) {
      setCopied(key);
      toast.success(tx(successMessage));
    } else {
      toast.error(tx("Could not copy. Select the text and copy it manually."));
    }
  };

  return { copied, copy };
}

function formatUsd(locale: string, value: number): string {
  return value.toLocaleString(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 10 ? 2 : 0,
  });
}

const contributeWays = [
  {
    icon: Code,
    title: "Contribute code",
    desc: "Zcash Grants Hub is open source. Pick up an issue, improve the UI, or add data sources.",
    href: HUB_REPO_URL,
    cta: "View repository",
    external: true,
  },
  {
    icon: Bug,
    title: "Report bugs & ideas",
    desc: "Found something broken or missing? Open an issue with steps to reproduce or a feature proposal.",
    href: `${HUB_REPO_URL}/issues`,
    cta: "Open an issue",
    external: true,
  },
  {
    icon: FileText,
    title: "Apply for a grant",
    desc: "Building for Zcash? Submit a proposal to Zcash Community Grants or the Coinholder program.",
    href: "/apply",
    cta: "Start an application",
    external: false,
  },
  {
    icon: MessageSquare,
    title: "Review proposals",
    desc: "Grant committees rely on community feedback. Weigh in on open proposals in the forum.",
    href: "/forum/discussions",
    cta: "Join discussions",
    external: false,
  },
  {
    icon: Vote,
    title: "ZecHub DAO",
    desc: "Take part in on-chain governance and mini-grants through the ZecHub DAO.",
    href: "/zechub/proposals",
    cta: "See proposals",
    external: false,
  },
  {
    icon: Heart,
    title: "Spread the word",
    desc: "Share funded projects and open calls with builders who could use a grant.",
    href: "/grants",
    cta: "Browse grants",
    external: false,
  },
];

const faqs = [
  {
    q: "Where do donations go?",
    a: "Donations fund hosting, infrastructure, and ongoing development of Zcash Grants Hub. This address belongs to the hub. It is not the Zcash Community Grants, Coinholder, or ZecHub DAO treasury.",
  },
  {
    q: "Is my donation private?",
    a: "Yes, if you send from a shielded wallet. Orchard and Sapling payments encrypt the sender, amount, and memo on-chain. If your wallet can only pay the transparent receiver, the transaction is publicly visible, like a Bitcoin payment.",
  },
  {
    q: "My exchange rejects this address. What should I do?",
    a: "Many exchanges don't support Unified Addresses yet. Withdraw ZEC to your own shielded wallet first, then donate from there. This also keeps your donation private.",
  },
  {
    q: "Which wallets can I use?",
    a: "Any wallet that supports Unified Addresses (ZIP-316). Most current Zcash wallets do, and many also read ZIP-321 payment QR codes, which fill in the amount and memo for you.",
  },
  {
    q: "How do I make sure I'm sending to the right address?",
    a: "After you paste or scan, check that the first and last 8 characters in your wallet match the fingerprint shown on this page. Only trust this address on zgrantshub.com over HTTPS or in the project's source code.",
  },
  {
    q: "Do I need to include a memo?",
    a: "No, the memo is optional. Add a handle or contact if you'd like a thank-you, or clear it to donate anonymously. Memos are only delivered on shielded payments.",
  },
];

export default function DonatePage() {
  const { text: tx, locale: uiLocale } = useUi();
  const zecPrice = useZecUsdPrice();
  const { copied, copy } = useCopy();
  const [amountInput, setAmountInput] = useState("");
  const [memo, setMemo] = useState(DEFAULT_DONATION_MEMO);
  const [qrMode, setQrMode] = useState<QrMode>("request");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const addressValid = useMemo(() => isValidMainnetUnifiedAddress(DONATION_UNIFIED_ADDRESS), []);
  const amount = amountInput.trim() ? normalizeZecAmount(amountInput) : null;
  const amountError = amountInput.trim() !== "" && amount == null;
  const memoBytes = utf8ByteLength(memo.trim());
  const memoTooLong = memoBytes > MAX_MEMO_BYTES;
  const usdEstimate = amount && zecPrice.usd != null ? Number(amount) * zecPrice.usd : null;

  const paymentUri = useMemo(
    () =>
      buildZip321Uri(DONATION_UNIFIED_ADDRESS, {
        amount,
        memo: memoTooLong ? null : memo,
        label: PAYMENT_LABEL,
      }),
    [amount, memo, memoTooLong],
  );
  const qrValue = qrMode === "request" ? paymentUri : DONATION_UNIFIED_ADDRESS;

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(qrValue, { errorCorrectionLevel: "M", margin: 2, width: 640 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [qrValue]);

  const downloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download =
      qrMode === "request"
        ? "zcash-grants-hub-donation-request.png"
        : "zcash-grants-hub-donation-address.png";
    a.click();
  };

  return (
    <div className="container mx-auto min-w-0 px-4 py-6 sm:py-8">
      <Head>
        <title>{tx("Donate & contribute · Zcash Grants Hub")}</title>
        <meta
          name="description"
          content={tx("Support Zcash Grants Hub with a shielded ZEC donation, or contribute code, feedback, and reviews to the Zcash grants ecosystem.")}
        />
        <meta property="og:title" content={tx("Donate & contribute · Zcash Grants Hub")} />
      </Head>

      {/* Hero */}
      <div className="mb-8 max-w-3xl sm:mb-10">
        <Badge variant="outline" className="mb-3 gap-1.5 border-primary/40 text-primary">
          <ShieldCheck className="h-3.5 w-3.5" />
          {tx("Shielded donations supported")}</Badge>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl lg:text-4xl">
          {tx("Donate & contribute")}</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {tx("Zcash Grants Hub is a free, open-source, community-run index of Zcash funding programs. You can help keep it independent and maintained by donating ZEC or by contributing your time.")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="gap-2" asChild>
            <a href="#donate">
              <Wallet className="h-4 w-4" />
              {tx("Donate ZEC")}</a>
          </Button>
          <Button variant="outline" className="gap-2" asChild>
            <a href="#contribute">
              <Code className="h-4 w-4" />
              {tx("Ways to contribute")}</a>
          </Button>
        </div>
      </div>

      {/* Donate */}
      <section id="donate" className="scroll-mt-24" aria-labelledby="donate-heading">
        <h2 id="donate-heading" className="sr-only">
          {tx("Donate ZEC")}</h2>

        {!addressValid && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>{tx("Donation address failed validation")}</AlertTitle>
            <AlertDescription>
              {tx("Please don't send funds. Report this on")}{" "}
              <a
                href={`${HUB_REPO_URL}/issues`}
                className="underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                {tx("GitHub")}</a>
              .
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="border-border/50 bg-card lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-primary" />
                {tx("Send a donation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="donate-amount">{tx("Amount (optional)")}</Label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_AMOUNTS.map((preset) => (
                    <Button
                      key={preset}
                      type="button"
                      size="sm"
                      variant={amount === preset ? "default" : "outline"}
                      aria-pressed={amount === preset}
                      onClick={() => setAmountInput(amount === preset ? "" : preset)}
                    >
                      {tx(preset)} {tx(" ZEC")}</Button>
                  ))}
                </div>
                <div className="relative">
                  <Input
                    id="donate-amount"
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={tx("Custom amount")}
                    value={amountInput}
                    onChange={(e) => setAmountInput(e.target.value.replace(",", "."))}
                    aria-invalid={amountError}
                    aria-describedby="donate-amount-hint"
                    className="pr-14"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                    {tx("ZEC")}</span>
                </div>
                <p
                  id="donate-amount-hint"
                  className={`text-xs ${amountError ? "text-destructive" : "text-muted-foreground"}`}
                >
                  {tx(amountError
                    ? "Enter a positive amount with up to 8 decimal places."
                    : usdEstimate != null
                      ? `≈ ${formatUsd(uiLocale, usdEstimate)} at the current ZEC price`
                      : "Leave empty to choose the amount in your wallet.")}
                </p>
              </div>

              {/* Memo */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between gap-2">
                  <Label htmlFor="donate-memo">{tx("Memo (optional, encrypted)")}</Label>
                  <span
                    className={`text-xs tabular-nums ${memoTooLong ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {memoBytes}/{MAX_MEMO_BYTES} {tx(" bytes")}</span>
                </div>
                <Textarea
                  id="donate-memo"
                  rows={2}
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  aria-invalid={memoTooLong}
                  placeholder={tx("Add a note or contact handle")}
                  className="resize-none"
                />
                {memoTooLong && (
                  <p className="text-xs text-destructive">
                    {tx("Memo exceeds 512 bytes and will be left out of the payment request.")}</p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium leading-none">{tx("Unified address")}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {DONATION_RECEIVERS.map((r) => (
                      <Badge
                        key={r}
                        variant="secondary"
                        className="text-[10px] font-medium"
                        title={tx(r === "Transparent" ? "Public receiver" : "Shielded receiver")}
                      >
                        {tx(r)}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="rounded-md border border-border/60 bg-secondary/40 p-3">
                  <p className="select-all break-all font-mono text-xs leading-relaxed text-foreground sm:text-[13px]">
                    {tx(DONATION_UNIFIED_ADDRESS)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {tx("Fingerprint:")}{" "}
                  <span className="font-mono text-foreground/90">
                    {tx(addressFingerprint(DONATION_UNIFIED_ADDRESS))}
                  </span>
                  {addressValid && (
                    <span className="ml-2 inline-flex items-center gap-1 text-emerald-500">
                      <Check className="h-3 w-3" aria-hidden />
                      {tx("checksum valid")}</span>
                  )}
                </p>
              </div>

              {/* Actions */}
              {addressValid && (
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Button
                    className="gap-2"
                    onClick={() => {
                      track("donate_copy_address");
                      void copy("address", DONATION_UNIFIED_ADDRESS, "Donation address copied");
                    }}
                  >
                    {copied === "address" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {tx("Copy address")}</Button>
                  <Button variant="outline" className="gap-2" asChild>
                    <a href={paymentUri} onClick={() => track("donate_open_wallet")}>
                      <ExternalLink className="h-4 w-4" />
                      {tx("Open in wallet")}</a>
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => void copy("uri", paymentUri, "Payment request copied")}
                  >
                    {copied === "uri" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                    {tx("Copy payment request")}</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <QrCode className="h-4 w-4 text-primary" />
                {tx("Scan with your wallet")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                role="radiogroup"
                aria-label={tx("QR code content")}
                className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-sm"
              >
                {(
                  [
                    ["request", "Payment request"],
                    ["address", "Address only"],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={qrMode === mode}
                    onClick={() => setQrMode(mode)}
                    className={`rounded-sm px-3 py-1.5 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      qrMode === mode
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {tx(label)}
                  </button>
                ))}
              </div>

              <div className="mx-auto aspect-square w-full max-w-[320px] rounded-lg bg-white p-3">
                {qrDataUrl && addressValid ? (
                  <img
                    src={qrDataUrl}
                    alt={
                      tx(qrMode === "request"
                        ? "QR code for a Zcash payment request to Zcash Grants Hub"
                        : "QR code of the Zcash Grants Hub donation address")
                    }
                    className="h-full w-full [image-rendering:pixelated]"
                  />
                ) : (
                  <div className="h-full w-full animate-pulse rounded bg-neutral-200" />
                )}
              </div>

              <p className="text-center text-xs text-muted-foreground">
                {tx(qrMode === "request"
                  ? "Includes the amount and memo above (ZIP-321). Your wallet will ask you to confirm."
                  : "Plain address for wallets that don't read payment requests.")}
              </p>

              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={downloadQr}
                disabled={!qrDataUrl || !addressValid}
              >
                <Download className="h-4 w-4" />
                {tx("Download QR code")}</Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <Card className="border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{tx("How to donate")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                <li>
                  {tx("Open a Zcash wallet that supports Unified Addresses (")}<a
                    href={ZCASH_WALLETS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    {tx("find one")}</a>
                  ).
                </li>
                <li>{tx("Scan the QR code, tap “Open in wallet”, or paste the copied address.")}</li>
                <li>
                  {tx("Check that the address fingerprint in your wallet matches")}{" "}
                  <span className="font-mono text-foreground/90">
                    {tx(addressFingerprint(DONATION_UNIFIED_ADDRESS))}
                  </span>
                  .
                </li>
                <li>{tx("Send from your shielded balance for a fully private donation.")}</li>
              </ol>
            </CardContent>
          </Card>

          <Alert className="border-primary/30 bg-primary/5">
            <ShieldCheck className="h-4 w-4 !text-primary" />
            <AlertTitle>{tx("Privacy by default")}</AlertTitle>
            <AlertDescription className="space-y-2 text-muted-foreground">
              <p>
                {tx("Shielded wallets pay the Orchard receiver automatically, so the sender, amount, and memo stay encrypted on-chain. This page doesn't track or store anything you enter. The payment request is built entirely in your browser.")}</p>
              <p>
                {tx("Sending from an exchange? Most can't pay Unified Addresses yet. Withdraw to your own wallet first.")}</p>
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Contribute */}
      <section
        id="contribute"
        className="mt-12 scroll-mt-24 sm:mt-16"
        aria-labelledby="contribute-heading"
      >
        <div className="mb-6">
          <h2 id="contribute-heading" className="text-xl font-bold text-foreground sm:text-2xl">
            {tx("Ways to contribute")}</h2>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {tx("Not every contribution is financial. Code, reviews, and feedback keep the Zcash grants ecosystem healthy.")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contributeWays.map((item) => {
            const Icon = item.icon;
            const cta = (
              <>
                {tx(item.cta)}
                {item.external && <ExternalLink className="h-3.5 w-3.5" />}
              </>
            );
            return (
              <Card
                key={item.title}
                className="flex flex-col border-border/50 bg-card transition-colors hover:border-primary/40"
              >
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{tx(item.title)}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{tx(item.desc)}</p>
                  <Button variant="link" className="mt-3 h-auto justify-start gap-1 p-0" asChild>
                    {item.external ? (
                      <a href={item.href} target="_blank" rel="noopener noreferrer">
                        {cta}
                      </a>
                    ) : (
                      <Link href={item.href}>{cta}</Link>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-12 sm:mt-16" aria-labelledby="donate-faq-heading">
        <h2 id="donate-faq-heading" className="mb-4 text-xl font-bold text-foreground sm:text-2xl">
          {tx("Frequently asked questions")}</h2>
        <Card className="border-border/50 bg-card">
          <CardContent className="px-5 py-1">
            <Accordion type="single" collapsible>
              {faqs.map((f, i) => (
                <AccordionItem
                  key={f.q}
                  value={`faq-${i}`}
                  className={i === faqs.length - 1 ? "border-b-0" : undefined}
                >
                  <AccordionTrigger className="text-left text-sm sm:text-base">
                    {tx(f.q)}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {tx(f.a)}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
