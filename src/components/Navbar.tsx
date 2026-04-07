import { Link, useLocation } from "react-router-dom";
import { Bell, Github, Menu, X, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

const navLinks = [
  { label: "Browse Grants", href: "/grants" },
  { label: "Apply",         href: "/apply"  },
  { label: "Analytics",     href: "/analytics" },
];

export function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-4 sm:h-16">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary sm:h-9 sm:w-9">
            <span className="text-base font-black text-primary-foreground sm:text-lg">Z</span>
          </div>
          <div className="hidden flex-col sm:flex">
            <span className="text-sm font-bold leading-none tracking-tight text-foreground">
              ZcashGrantHub
            </span>
            <span className="mt-0.5 text-[10px] leading-none text-muted-foreground">
              Zcash Community Grants
            </span>
          </div>
          {/* Show just the name on very small screens */}
          <span className="text-sm font-bold text-foreground sm:hidden">ZcashGrantHub</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-0.5 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`relative rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
              {/* Active underline indicator */}
              {isActive(link.href) && (
                <span className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* ZEC price pill — desktop only */}
          <div className="hidden items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium lg:flex">
            <span className="text-muted-foreground">ZEC</span>
            <span className="text-foreground">$268.42</span>
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            <span className="text-emerald-400">+2.4%</span>
          </div>

          {/* Notifications */}
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

          {/* Connect GitHub — hidden on mobile */}
          <Link to="/dashboard">
            <Button
              variant="outline"
              size="sm"
              className="hidden h-9 gap-2 sm:flex"
            >
              <Github className="h-4 w-4" />
              <span className="hidden lg:inline">Connect GitHub</span>
              <span className="lg:hidden">GitHub</span>
            </Button>
          </Link>

          {/* Hamburger */}
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="container mx-auto flex flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}

            {/* ZEC price in mobile menu */}
            <div className="mt-1 flex items-center gap-1.5 rounded-md bg-secondary px-3 py-2 text-xs font-medium">
              <span className="text-muted-foreground">ZEC</span>
              <span className="font-semibold text-foreground">$268.42</span>
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400">+2.4%</span>
            </div>

            <Link to="/dashboard" className="mt-1">
              <Button variant="outline" size="sm" className="h-10 w-full gap-2">
                <Github className="h-4 w-4" />
                Connect GitHub
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
