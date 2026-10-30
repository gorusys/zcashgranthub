import { useUi } from "@/i18n/useUi";
import Link from "next/link";
import { CalendarPlus, Rss } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { statusConfig } from "@/data/grantTypes";
import { useGrantUpdates, useWatchlist } from "@/hooks/useWatchlist";

/** Watched grants with changes since last seen, plus calendar/RSS subscriptions. */
export function WatchlistPanel() {
  const { text: tx, locale: uiLocale } = useUi();
  const { watch, toggle } = useWatchlist();
  const { updates, markSeen } = useGrantUpdates();
  const changed = new Map(updates.map((u) => [u.grantId, u]));
  const entries = Object.entries(watch).sort((a, b) => a[1].title.localeCompare(b[1].title, uiLocale));

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base">{tx("Updates (")}{updates.length})</CardTitle>
          {updates.length > 0 && (
            <Button variant="outline" size="sm" onClick={markSeen}>
              {tx("Mark all seen")}</Button>
          )}
        </CardHeader>
        <CardContent className="text-sm">
          {updates.length === 0 ? (
            <p className="text-muted-foreground">
              {tx("Nothing new. Status changes and new GitHub activity on grants you watch (and your own applications, when GitHub is connected) appear here and under the bell.")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {updates.map((u) => (
                <li key={u.grantId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <Link href={`/grants/${u.grantId}`} className="min-w-0 flex-1 font-medium text-foreground hover:text-primary">
                    {u.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {tx(u.kind === "status"
                      ? `${tx(statusConfig[u.from!].label)} → ${tx(statusConfig[u.to!].label)}`
                      : u.kind === "new"
                        ? "Your application"
                        : "New activity")}{" "}
                    · {new Date(u.at).toLocaleDateString(uiLocale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{tx("Watching (")}{entries.length})</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {entries.length === 0 ? (
            <p className="text-muted-foreground">
              {tx("Press ")}<span className="font-medium text-foreground">{tx("Watch")}</span> {tx(" on any grant page. Your watchlist is stored only in this browser; nothing is sent to a server.")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {entries.map(([id, e]) => (
                <li key={id} className="flex flex-wrap items-center gap-2 py-2">
                  <Link href={`/grants/${id}`} className="min-w-0 flex-1 text-foreground hover:text-primary">
                    {e.title}
                  </Link>
                  {changed.has(id) && <span className="text-xs font-medium text-primary">{tx("Updated")}</span>}
                  <StatusBadge status={e.status} />
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => toggle({ id, ...e })}>
                    {tx("Unwatch")}</Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{tx("Get reminders outside the site")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-sm">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href="/calendar.ics">
              <CalendarPlus className="h-4 w-4" /> {tx(" Deadlines calendar (.ics)")}</a>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href="/feed.xml">
              <Rss className="h-4 w-4" /> {tx(" Grant updates (RSS)")}</a>
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            {tx("Subscribe to the calendar URL in Google Calendar, Apple Calendar or Thunderbird to get Coinholder retro round deadlines, voting windows and protocol milestones.")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
