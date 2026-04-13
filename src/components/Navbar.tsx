import Link from "next/link";
import type { NextRouter } from "next/router";
import { useRouter } from "next/router";
import { Bell, Github, Menu, X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import {
  beginGitHubOAuth,
  clearGitHubSession,
  readGitHubSession,
  subscribeToGitHubAuth,
} from "@/lib/githubAuth";

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
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary sm:h-9 sm:w-9">
            <span className="text-base font-black text-primary-foreground sm:text-lg">Z</span>
          </div>
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
          <div className="hidden items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium lg:flex">
            <span className="text-muted-foreground">ZEC</span>
            <span className="text-foreground">$268.42</span>
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            <span className="text-emerald-400">+2.4%</span>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="relative h-9 w-9 text-muted-foreground"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              3
            </span>
          </Button>

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

            <div className="mt-1 flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-xs font-medium">
              <span className="text-muted-foreground">ZEC</span>
              <span className="font-semibold text-foreground">$268.42</span>
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">+2.4%</span>
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
