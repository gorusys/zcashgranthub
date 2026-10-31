import { useUi } from "@/i18n/useUi";
import Link from "next/link";
import { useT } from "@/i18n";
import { ArrowUpRight, Github, Heart } from "lucide-react";
import { navigationGroups, isFeedLink } from "@/lib/navigation";

export function Footer() {
  const { text: tx } = useUi();
  const { t } = useT();
  const linkClass = "inline-flex min-h-10 items-center py-2 text-sm leading-relaxed text-muted-foreground transition-colors hover:text-primary focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  return (
    <footer className="border-t border-border/60 bg-secondary/20">
      <div className="container mx-auto px-5 py-10 sm:py-14">
        <div className="flex flex-col justify-between gap-6 border-b border-border/60 pb-8 sm:flex-row sm:items-center">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <img src="/favicon.svg" alt="" width={40} height={40} className="rounded-xl" />
              <span className="text-base font-bold tracking-tight">{tx("Zcash Grants Hub")}</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t("footer.subtitle")}</p>
          </div>
          <Link href="/donate" className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-4 text-sm font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Heart className="h-4 w-4" aria-hidden />{t("nav.donate")}<ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <nav aria-label={tx("Footer navigation")} className="grid grid-cols-2 gap-x-6 gap-y-8 py-8 md:grid-cols-3 xl:grid-cols-5">
          {navigationGroups.map(group => <section key={group.id} aria-labelledby={`footer-${group.id}`}>
            <h2 id={`footer-${group.id}`} className="mb-3 text-sm font-semibold text-foreground">{tx(group.label)}</h2>
            <ul className="space-y-0.5">
              {group.items.map(item => <li key={item.href}>{isFeedLink(item.href) ? <a href={item.href} className={linkClass}>{tx(item.label)}</a> : <Link href={item.href} className={linkClass}>{tx(item.label)}</Link>}</li>)}
            </ul>
          </section>)}
        </nav>
        <div className="flex flex-col gap-4 border-t border-border/60 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-muted-foreground">{t("footer.copyright", { year: new Date().getFullYear() })}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <a href="https://forum.zcashcommunity.com" target="_blank" rel="noopener noreferrer" className={linkClass}>{t("footer.forum")}<ArrowUpRight className="ml-1 h-3 w-3" aria-hidden /></a>
            <a href="https://github.com/ZcashCommunityGrants" target="_blank" rel="noopener noreferrer" className={linkClass}><Github className="mr-2 h-4 w-4" aria-hidden />{tx("GitHub")}<ArrowUpRight className="ml-1 h-3 w-3" aria-hidden /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}
