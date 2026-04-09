import Link from "next/link";

const links = [
  { label: "Apply", href: "/apply" },
  { label: "Browse", href: "/grants" },
  { label: "Analytics", href: "/analytics" },
  { label: "Forum", href: "https://forum.zcashcommunity.com", external: true },
  { label: "GitHub", href: "https://github.com/ZcashCommunityGrants", external: true },
];

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-black text-primary-foreground">Z</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">ZcashGrantHub</span>
              <span className="text-xs text-muted-foreground">Zcash Community Grants</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {links.map((link) =>
              link.external ? (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              )
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-border/50 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ZcashGrantHub. Built for the Zcash Community.
          </p>
        </div>
      </div>
    </footer>
  );
}
