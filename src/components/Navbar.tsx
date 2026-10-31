import { navigationGroups, isNavItemActive, isFeedLink } from "@/lib/navigation";
import { useUi } from "@/i18n/useUi";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowUpRight, Bell, ChevronDown, Compass, Github, Heart, Layers, Menu, Minus, TrendingDown, TrendingUp, UserRound, Wallet, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect, type ReactNode } from "react";
import {
  beginGitHubOAuth,
  clearGitHubSession,
  readGitHubSession,
  subscribeToGitHubAuth,
} from "@/lib/githubAuth";
import { useZecUsdPrice } from "@/hooks/useZecUsdPrice";
import type { ZecUsdPriceState } from "@/hooks/useZecUsdPrice";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useGrantUpdates } from "@/hooks/useWatchlist";
import { statusConfig } from "@/data/grantTypes";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useT } from "@/i18n";
import { Sheet, SheetContent, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const groupIcons = { explore: Compass, funding: Wallet, insights: Layers, activity: UserRound, resources: BookOpen };


function ZecPricePill({ state, className }: { state: ZecUsdPriceState; className?: string }) {
  const { text: tx, locale: uiLocale } = useUi();
  const { usd, change24hPct, status } = state;
  const loading = status === "idle" || status === "loading";

  const priceLabel =
    usd != null
      ? `$${usd.toLocaleString(uiLocale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : loading
        ? "…"
        : "—";

  let changeEl: ReactNode = null;
  if (change24hPct != null && usd != null) {
    const flat = Math.abs(change24hPct) < 0.05;
    const up = change24hPct >= 0.05;
    const down = change24hPct <= -0.05;
    const label = `${change24hPct >= 0 ? "+" : ""}${change24hPct.toFixed(2)}%`;
    changeEl = (
      <>
        {up && <TrendingUp className="h-3 w-3 shrink-0 text-emerald-400" aria-hidden />}
        {down && <TrendingDown className="h-3 w-3 shrink-0 text-red-400" aria-hidden />}
        {flat && <Minus className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />}
        <span
          className={
            up ? "text-emerald-400" : down ? "text-red-400" : "text-muted-foreground"
          }
        >
          {tx(label)}
        </span>
      </>
    );
  } else if (usd != null && loading) {
    changeEl = <span className="text-muted-foreground">…</span>;
  } else if (usd != null) {
    changeEl = <span className="text-muted-foreground">—</span>;
  }

  return (
    <div
      className={`flex items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium ${className ?? ""}`}
      title={tx("ZEC/USD from CoinGecko (refreshes about every 2 minutes)")}
    >
      <span className="text-muted-foreground">{tx("ZEC")}</span>
      <span className="text-foreground">{tx(priceLabel)}</span>
      {changeEl}
    </div>
  );
}

function UpdatesMenu({ triggerClassName }: { triggerClassName?: string }) {
  const { text: tx } = useUi();
  const { updates, markSeen, active } = useGrantUpdates();
  const { t } = useT();
  const count = updates.length;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={triggerClassName ?? "relative h-9 w-9 text-muted-foreground"}
          aria-label={tx(count ? (count === 1 ? t("updates.countOne") : t("updates.count", { n: count })) : t("updates.none"))}
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          {t("updates.title")}
          {count > 0 && (
            <button type="button" onClick={markSeen} className="text-xs font-normal text-primary hover:underline">
              {t("updates.markSeen")}
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count > 0 ? (
          updates.slice(0, 6).map((u) => (
            <DropdownMenuItem key={u.grantId} asChild>
              <Link href={`/grants/${u.grantId}`} className="flex cursor-pointer flex-col items-start gap-0.5">
                <span className="line-clamp-1 w-full text-left text-sm text-foreground">{u.title}</span>
                <span className="w-full text-left text-xs text-muted-foreground">
                  {tx(u.kind === "status"
                    ? `${tx(statusConfig[u.from!].label)} → ${tx(statusConfig[u.to!].label)}`
                    : u.kind === "new"
                      ? `${t("updates.yourApplication")} · ${tx(statusConfig[u.to!].label)}`
                      : t("updates.newActivity"))}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        ) : (
          <p className="px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">
            {tx(active ? t("updates.noChanges") : t("updates.empty"))}
          </p>
        )}
        {count > 6 && (
          <DropdownMenuItem asChild>
            <Link href="/dashboard?tab=notifications" className="cursor-pointer text-xs text-primary">
              {t("updates.seeAll", { n: count })}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard?tab=notifications" className="cursor-pointer">
            {t("updates.watchlist")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/calendar.ics" className="cursor-pointer">
            {t("updates.calendar")}
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="/feed.xml" className="cursor-pointer">
            {t("updates.rss")}
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Navbar() {
  const { text: tx } = useUi();
  const router = useRouter();
  const { t } = useT();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionLogin, setSessionLogin] = useState<string | null>(null);
  const zecPrice = useZecUsdPrice();

  useEffect(() => {
    setMobileOpen(false);
  }, [router.asPath]);

  useEffect(() => {
    if (!mobileOpen) return;
    const desktop = window.matchMedia("(min-width: 1280px)");
    const closeOnDesktop = () => { if (desktop.matches) setMobileOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
    };
  }, [mobileOpen]);

  useEffect(() => {
    setSessionLogin(readGitHubSession()?.user.login ?? null);
    const syncSession = () => setSessionLogin(readGitHubSession()?.user.login ?? null);
    const unsub = subscribeToGitHubAuth(syncSession);
    window.addEventListener("storage", syncSession);
    return () => {
      unsub();
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  return (
    <nav aria-label={tx("Main navigation")} className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:h-16">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3">
          <img
            src="/favicon.svg"
            alt=""
            width={36}
            height={36}
            className="h-8 w-8 shrink-0 rounded-lg sm:h-9 sm:w-9"
            aria-hidden
          />
          <div className="hidden flex-col sm:flex">
            <span className="whitespace-nowrap text-sm font-bold leading-none tracking-tight text-foreground">
              {tx("Zcash Grants Hub")}</span>
            <span className="mt-0.5 whitespace-nowrap text-[10px] leading-none text-muted-foreground">
              {t("nav.tagline")}
            </span>
          </div>
          <span className="text-sm font-bold text-foreground sm:hidden">{tx("Zcash Grants Hub")}</span>
        </Link>

        <div className="hidden items-center gap-0.5 xl:flex">
          {navigationGroups.map((group) => {
            const active = group.items.some((item) => isNavItemActive(item, router));
            return (
              <DropdownMenu key={group.id}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className={`h-10 gap-1.5 px-2.5 text-sm ${active ? "text-primary" : "text-muted-foreground"}`}>
                    {tx(group.label)}
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 p-2">
                  <DropdownMenuLabel className="text-xs text-muted-foreground">{tx(group.label)}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {group.items.map((item) => {
                    const selected = isNavItemActive(item, router);
                    const content = <>
                      <span className="font-medium">{tx(item.label)}</span>
                      {item.description && <span className="text-xs leading-relaxed text-muted-foreground">{tx(item.description)}</span>}
                    </>;
                    const className = `flex cursor-pointer flex-col items-start gap-0.5 rounded-md px-3 py-2.5 ${selected ? "bg-primary/10 text-primary" : ""}`;
                    return (
                      <DropdownMenuItem key={item.href} className={className} asChild>
                        {isFeedLink(item.href) ? (
                          <a href={item.href}>{content}</a>
                        ) : (
                          <Link href={item.href} aria-current={selected ? "page" : undefined}>{content}</Link>
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ZecPricePill state={zecPrice} className="hidden 2xl:flex" />

          <Button
            variant={router.pathname === "/donate" ? "secondary" : "ghost"}
            size="sm"
            className="hidden h-9 gap-1.5 text-primary hover:text-primary md:flex"
            asChild
          >
            <Link href="/donate">
              <Heart className="h-4 w-4" />
              {t("nav.donate")}
            </Link>
          </Button>

          <LanguageSwitcher className="hidden h-9 w-9 text-muted-foreground xl:inline-flex" />
          <ThemeToggle className="h-9 w-9 text-muted-foreground" />

          <UpdatesMenu />

          {sessionLogin ? (
            <Button
              variant="outline"
              size="sm"
              className="hidden h-9 gap-2 sm:flex"
              onClick={clearGitHubSession}
            >
              <Github className="h-4 w-4" />
              <span className="hidden lg:inline">@{tx(sessionLogin)} ({t("nav.disconnect")})</span>
              <span className="lg:hidden">@{tx(sessionLogin)}</span>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="hidden h-9 gap-2 sm:flex"
              onClick={() => void beginGitHubOAuth()}
            >
              <Github className="h-4 w-4" />
              <span className="hidden 2xl:inline">{t("nav.connectGithub")}</span>
              <span className="2xl:hidden">{tx("GitHub")}</span>
            </Button>
          )}

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl xl:hidden" aria-label={tx("Open menu")}>
                <Menu className="h-5 w-5" aria-hidden />
              </Button>
            </SheetTrigger>
            <SheetContent id="mobile-navigation" className="flex h-[100dvh] w-full flex-col gap-0 p-0 sm:max-w-md [&>button]:right-5 [&>button]:top-6 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-xl [&>button]:border [&>button]:border-border">
              <div className="border-b border-border/60 px-5 pb-5 pt-6 pr-20">
                <div className="mb-3 flex items-center gap-3">
                  <img src="/favicon.svg" alt="" width={36} height={36} className="rounded-xl" />
                  <SheetTitle className="text-base">{tx("Zcash Grants Hub")}</SheetTitle>
                </div>
                <SheetDescription className="text-xs leading-relaxed">{t("nav.tagline")}</SheetDescription>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
                <Button asChild className="mb-5 h-12 w-full justify-between rounded-xl">
                  <Link href="/find-funding" onClick={() => setMobileOpen(false)}>{tx("Find the right funding")}<ArrowUpRight className="h-4 w-4" aria-hidden /></Link>
                </Button>
                <Accordion type="multiple" defaultValue={[navigationGroups.find(group => group.items.some(item => isNavItemActive(item, router)))?.id ?? "explore"]}>
                  {navigationGroups.map(group => {
                    const Icon = groupIcons[group.id as keyof typeof groupIcons];
                    const active = group.items.some(item => isNavItemActive(item, router));
                    return <AccordionItem key={group.id} value={group.id} className="border-border/50">
                      <AccordionTrigger className="min-h-14 py-3 text-sm hover:no-underline">
                        <span className={`flex items-center gap-3 ${active ? "text-primary" : ""}`}><Icon className="h-4 w-4" aria-hidden />{tx(group.label)}</span>
                      </AccordionTrigger>
                      <AccordionContent className="space-y-1 pb-3">
                        {group.items.map(item => {
                          const selected = isNavItemActive(item, router);
                          const className = `flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 py-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`;
                          const content = <><span>{tx(item.label)}</span>{selected && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}</>;
                          return isFeedLink(item.href) ? <a key={item.href} href={item.href} className={className} onClick={() => setMobileOpen(false)}>{content}</a> : <Link key={item.href} href={item.href} className={className} aria-current={selected ? "page" : undefined} onClick={() => setMobileOpen(false)}>{content}</Link>;
                        })}
                      </AccordionContent>
                    </AccordionItem>;
                  })}
                </Accordion>
              </div>
              <div className="shrink-0 space-y-3 border-t border-border/60 bg-secondary/30 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <div className="flex items-center justify-between gap-2">
                  <LanguageSwitcher showLabel className="h-11 min-w-0 justify-start text-muted-foreground" />
                  <ThemeToggle className="h-11 w-11 shrink-0 rounded-xl border border-border text-muted-foreground" />
                </div>
                <Button variant="outline" className="h-11 w-full gap-2 rounded-xl" onClick={() => sessionLogin ? clearGitHubSession() : void beginGitHubOAuth()}>
                  <Github className="h-4 w-4" />{sessionLogin ? `@${sessionLogin} (${t("nav.disconnect")})` : t("nav.connectGithub")}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

    </nav>
  );
}
