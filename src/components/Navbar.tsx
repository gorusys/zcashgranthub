import Link from "next/link";
import type { NextRouter } from "next/router";
import { useRouter } from "next/router";
import { Bell, Github, Menu, Minus, TrendingDown, TrendingUp, X } from "lucide-react";
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

const ZCG_FORUM_GRANTS = "https://forum.zcashcommunity.com/c/grants/12";

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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={triggerClassName ?? "relative h-9 w-9 text-muted-foreground"}
          aria-label="Updates and useful links"
        >
          <Bell className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Updates & links</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="cursor-pointer">
            My dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/grants" className="cursor-pointer">
            Browse grants
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={ZCG_FORUM_GRANTS}
            target="_blank"
            rel="noopener noreferrer"
            className="cursor-pointer"
          >
            ZCG forum (grants)
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <p className="px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">
          In-app notifications are not wired yet. Watch your GitHub issues and the forum for grant
          updates.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type NavLink = {
  label: string;
  href: string;
  active: (router: NextRouter) => boolean;
};

const navLinks: NavLink[] = [
  {
    label: "ZCG Grants",
    href: "/grants?program=zcg",
    active: (r) => r.pathname === "/grants" && r.query.program === "zcg",
  },
  {
    label: "Coinholder",
    href: "/grants?program=coinholder",
    active: (r) => r.pathname === "/grants" && r.query.program === "coinholder",
  },
  {
    label: "ZecHub DAO",
    href: "/zechub/proposals",
    active: (r) => r.pathname.startsWith("/zechub/proposals"),
  },
  {
    label: "Apply",
    href: "/apply",
    active: (r) => r.pathname === "/apply",
  },
  {
    label: "Analytics",
    href: "/analytics",
    active: (r) => r.pathname === "/analytics",
  },
];

export function Navbar() {
  const router = useRouter();
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
            <span className="text-sm font-bold leading-none tracking-tight text-foreground">
              Zcash Grants Hub
            </span>
            <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">
              ZCG · Coinholder · ZecHub DAO
            </span>
          </div>
          <span className="text-sm font-bold text-foreground sm:hidden">Zcash Grants Hub</span>
        </Link>

        <div className="hidden items-center gap-0.5 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                link.active(router)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
              {link.active(router) && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ZecPricePill state={zecPrice} className="hidden lg:flex" />

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
              <span className="hidden lg:inline">@{sessionLogin} (Disconnect)</span>
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
              <span className="hidden lg:inline">Connect GitHub</span>
              <span className="lg:hidden">GitHub</span>
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-muted-foreground md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((prev) => !prev)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className={`flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  link.active(router)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <ZecPricePill state={zecPrice} className="mt-1 w-full justify-between px-3 py-2" />

            <ThemeToggle className="mt-1 h-10 w-10 text-muted-foreground" />

            <div className="mt-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-10 w-full justify-start gap-2 text-muted-foreground"
                    aria-label="Updates and useful links"
                  >
                    <Bell className="h-4 w-4" />
                    Updates & links
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[min(100vw-2rem,20rem)]">
                  <DropdownMenuLabel>Quick links</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">
                      My dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/grants" className="cursor-pointer">
                      Browse grants
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a
                      href={ZCG_FORUM_GRANTS}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cursor-pointer"
                    >
                      ZCG forum (grants)
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <p className="px-2 py-1.5 text-xs leading-relaxed text-muted-foreground">
                    In-app notifications are not wired yet. Watch GitHub issues and the forum for
                    updates.
                  </p>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {sessionLogin ? (
              <Button
                variant="outline"
                size="sm"
                className="mt-1 h-10 w-full gap-2"
                onClick={clearGitHubSession}
              >
                <Github className="h-4 w-4" />
                @{sessionLogin} (Disconnect)
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-1 h-10 w-full gap-2"
                onClick={() => void beginGitHubOAuth()}
              >
                <Github className="h-4 w-4" />
                Connect GitHub
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
