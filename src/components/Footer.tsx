import Link from "next/link";
import { useT, type MessageKey } from "@/i18n";

type FooterLink = { labelKey: MessageKey | null; text?: string; href: string; external?: boolean };

const links: FooterLink[] = [
  { labelKey: "footer.website", href: "https://zgrantshub.com", external: true },
  { labelKey: "footer.apply", href: "/apply" },
  { labelKey: "footer.browse", href: "/grants" },
  { labelKey: "footer.discussions", href: "/forum/discussions" },
  { labelKey: "footer.analytics", href: "/analytics" },
  { labelKey: "footer.streams", href: "/funding-streams" },
  { labelKey: "footer.bounties", href: "/bounties" },
  { labelKey: "footer.projects", href: "/projects" },
  { labelKey: "footer.api", href: "/developers" },
  { labelKey: "footer.donate", href: "/donate" },
  { labelKey: "footer.contribute", href: "/donate#contribute" },
  { labelKey: "footer.forum", href: "https://forum.zcashcommunity.com", external: true },
  { labelKey: null, text: "GitHub", href: "https://github.com/ZcashCommunityGrants", external: true },
];

export function Footer() {
  const { t } = useT();
  return (
    <footer className="border-t border-border/50 bg-background">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-3">
            <img
              src="/favicon.svg"
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 shrink-0 rounded-lg"
              aria-hidden
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-foreground">Zcash Grants Hub</span>
              <span className="text-xs text-muted-foreground">{t("footer.subtitle")}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            {links.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.labelKey ? t(link.labelKey) : link.text}
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.labelKey ? t(link.labelKey) : link.text}
                </Link>
              )
            )}
          </div>
        </div>

        <div className="mt-8 border-t border-border/50 pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            {t("footer.copyright", { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </footer>
  );
}
