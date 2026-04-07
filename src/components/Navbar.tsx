import { Link, useLocation } from "react-router-dom";
import { Bell, Github, Menu, X, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navLinks = [
  { label: "Browse Grants", href: "/grants" },
  { label: "Apply", href: "/apply" },
  { label: "Analytics", href: "/analytics" },
];

export function Navbar() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-lg font-black text-primary-foreground">Z</span>
          </div>
          <div className="hidden flex-col sm:flex">
            <span className="text-sm font-bold tracking-tight text-foreground leading-none">
              ZcashGrantHub
            </span>
            <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
              Zcash Community Grants
            </span>
          </div>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              to={link.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === link.href
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-medium lg:flex">
            <span className="text-muted-foreground">ZEC</span>
            <span className="text-foreground">$38.42</span>
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            <span className="text-emerald-400">+2.4%</span>
          </div>

          <Button variant="ghost" size="icon" className="relative text-muted-foreground">
            <Bell className="h-4 w-4" />
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              3
            </span>
          </Button>

          <Link to="/dashboard">
            <Button variant="outline" size="sm" className="hidden gap-2 sm:flex">
              <Github className="h-4 w-4" />
              Connect GitHub
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/50 bg-background p-4 md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  location.pathname === link.href
                    ? "bg-secondary text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" size="sm" className="mt-2 w-full gap-2">
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
