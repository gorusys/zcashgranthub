import Link from "next/link";
import type { NextRouter } from "next/router";
import { useRouter } from "next/router";
import { Bell, Github, Heart, Menu, Minus, TrendingDown, TrendingUp, X } from "lucide-react";
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
import { useT, type MessageKey } from "@/i18n";


function ZecPricePill({ state, className }: { state: ZecUsdPriceState; className?: string }) {
  const { usd, change24hPct, status } = state;
  const loading = status === "idle" || status === "loading";

  const priceLabel =
    usd != null
      ? `$${usd.toLocaleString(undefined, {
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
          {label}
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
      title="ZEC/USD from CoinGecko (refreshes about every 2 minutes)"
    >
      <span className="text-muted-foreground">ZEC</span>
      <span className="text-foreground">{priceLabel}</span>
      {changeEl}
    </div>
  );
}

function UpdatesMenu({ triggerClassName }: { triggerClassName?: string }) {
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
          aria-label={count ? (count === 1 ? t("updates.countOne") : t("updates.count", { n: count })) : t("updates.none")}
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
                  {u.kind === "status"
                    ? `${statusConfig[u.from!].label} → ${statusConfig[u.to!].label}`
                    : u.kind === "new"
                      ? `${t("updates.yourApplication")} · ${statusConfig[u.to!].label}`
                      : t("updates.newActivity")}
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        ) : (
          <p className="px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">
            {active ? t("updates.noChanges") : t("updates.empty")}
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

type NavLink = {
  labelKey: MessageKey;
  href: string;
  active: (router: NextRouter) => boolean;
};

const navLinks: NavLink[] = [
  {
    labelKey: "nav.grants",
    href: "/grants",
    active: (r) => r.pathname.startsWith("/grants"),
  },
  {
    labelKey: "nav.retro",
    href: "/retro",
    active: (r) => r.pathname === "/retro",
  },
  {
    labelKey: "nav.decisions",
    href: "/decisions",
    active: (r) => r.pathname === "/decisions",
  },
  {
    labelKey: "nav.zechub",
    href: "/zechub/proposals",
    active: (r) => r.pathname.startsWith("/zechub/proposals"),
  },
  {
    labelKey: "nav.apply",
    href: "/apply",
    active: (r) => r.pathname === "/apply",
  },
  {
    labelKey: "nav.forum",
    href: "/forum/discussions",
    active: (r) => r.pathname === "/forum/discussions",
  },
  {
    labelKey: "nav.analytics",
    href: "/analytics",
    active: (r) => r.pathname === "/analytics",
  },
];

export function Navbar() {
  const router = useRouter();
  const { t } = useT();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sessionLogin, setSessionLogin] = useState<string | null>(null);
  const zecPrice = useZecUsdPrice();

  useEffect(() => {
    setMobileOpen(false);
  }, [router.asPath]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
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
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
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
              Zcash Grants Hub
            </span>
            <span className="mt-0.5 whitespace-nowrap text-[10px] leading-none text-muted-foreground">
              {t("nav.tagline")}
            </span>
          </div>
          <span className="text-sm font-bold text-foreground sm:hidden">Zcash Grants Hub</span>
        </Link>

        <div className="hidden items-center gap-0.5 xl:flex">
          {navLinks.map((link) => (
            <Link
              key={link.labelKey}
              href={link.href}
              className={`relative whitespace-nowrap rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                link.active(router)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(link.labelKey)}
              {link.active(router) && (
                <span className="absolute bottom-0 left-2.5 right-2.5 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          ))}
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
              <span className="hidden lg:inline">@{sessionLogin} ({t("nav.disconnect")})</span>
              <span className="lg:hidden">@{sessionLogin}</span>
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
              <span className="2xl:hidden">GitHub</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground xl:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl xl:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.labelKey}
                href={link.href}
                className={`flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  link.active(router)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {t(link.labelKey)}
              </Link>
            ))}

            <Link
              href="/donate"
              className={`flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                router.pathname === "/donate"
                  ? "bg-primary/10 text-primary"
                  : "text-primary hover:bg-secondary"
              }`}
            >
              <Heart className="h-4 w-4" />
              {t("nav.donateContribute")}
            </Link>

            <ZecPricePill state={zecPrice} className="mt-1 w-full justify-between px-3 py-2" />

            <ThemeToggle className="mt-1 h-10 w-10 text-muted-foreground" />

            <Button asChild variant="outline" size="sm" className="mt-1 h-10 w-full justify-start gap-2 text-muted-foreground">
              <Link href="/dashboard?tab=notifications">
                <Bell className="h-4 w-4" />
                {t("updates.watchlist")}
              </Link>
            </Button>

            <LanguageSwitcher showLabel className="mt-1 h-10 w-full justify-start text-muted-foreground" />

            {sessionLogin ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-1 h-10 w-full gap-2"
                onClick={clearGitHubSession}
              >
                <Github className="h-4 w-4" />
                @{sessionLogin} ({t("nav.disconnect")})
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-1 h-10 w-full gap-2"
                onClick={() => void beginGitHubOAuth()}
              >
                <Github className="h-4 w-4" />
                {t("nav.connectGithub")}
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
