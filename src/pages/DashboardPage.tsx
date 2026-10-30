import { useUi } from "@/i18n/useUi";
import { useEffect, useMemo, useState } from "react";
import { Bell, FileText, LayoutDashboard, ChevronRight, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useGrants } from "@/hooks/useGrants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useRouter } from "next/router";
import { WatchlistPanel } from "@/components/WatchlistPanel";
import { readGitHubSession, subscribeToGitHubAuth } from "@/lib/githubAuth";

export default function DashboardPage() {
  const { text: tx, locale: uiLocale } = useUi();
  const { data: grants = [], isLoading } = useGrants();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("applications");
  useEffect(() => {
    const tab = router.query.tab;
    if (typeof tab === "string" && ["applications", "milestones", "notifications"].includes(tab)) setActiveTab(tab);
  }, [router.query.tab]);
  /** `undefined` = not hydrated yet (avoid SSR/client mismatch). */
  const [login, setLogin] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const sync = () => {
      const s = readGitHubSession();
      setLogin(s?.user.login?.toLowerCase() ?? null);
    };
    sync();
    const unsub = subscribeToGitHubAuth(sync);
    window.addEventListener("storage", sync);
    return () => {
      unsub();
      window.removeEventListener("storage", sync);
    };
  }, []);

  const myGrants = useMemo(() => {
    if (login == null || login === "") return [];
    return grants.filter(
      (g) => g.githubUsername && g.githubUsername.toLowerCase() === login
    );
  }, [grants, login]);

  const milestoneRows = useMemo(
    () =>
      myGrants
        .filter((g) => g.status === "ACTIVE")
        .flatMap((g) =>
          g.milestones
            .filter((m) => m.status !== "Paid")
            .map((m) => ({ grant: g, milestone: m }))
        ),
    [myGrants]
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-foreground">{tx("Dashboard")}</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-secondary">
          <TabsTrigger value="applications" className="gap-2">
            <LayoutDashboard className="h-4 w-4" /> {tx(" My Applications")}</TabsTrigger>
          <TabsTrigger value="milestones" className="gap-2">
            <FileText className="h-4 w-4" /> {tx(" Milestone Reports")}</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" /> {tx(" Notifications")}</TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <Card className="border-border/50 bg-card">
            <CardContent className="p-0">
              {login === undefined ? (
                <div className="p-6 text-sm text-muted-foreground">{tx("Checking GitHub session…")}</div>
              ) : login === null ? (
                <div className="p-6 text-sm text-muted-foreground">
                  <p className="mb-3">
                    {tx("Connect GitHub with the same account you use on grant issues so we can list applications where you are the GitHub author.")}</p>
                  <p className="text-xs">
                    {tx("Grant rows are matched by the issue author field from GitHub—not by email.")}</p>
                </div>
              ) : isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">{tx("Loading grants from GitHub…")}</div>
              ) : myGrants.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  {tx("No grants found for ")}<span className="font-mono text-foreground">@{login}</span>{" "}
                  {tx("in the configured repos. Open an application from")}{" "}
                  <Link href="/apply" className="text-primary underline-offset-2 hover:underline">
                    {tx("Apply")}</Link>{" "}
                  {tx("or browse")}{" "}
                  <Link href="/grants" className="text-primary underline-offset-2 hover:underline">
                    {tx("Grants")}</Link>
                  .
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="px-4 py-3 text-left font-medium">{tx("Title")}</th>
                        <th className="px-4 py-3 text-left font-medium">{tx("Status")}</th>
                        <th className="px-4 py-3 text-right font-medium">{tx("Amount")}</th>
                        <th className="px-4 py-3 text-left font-medium">{tx("Submitted")}</th>
                        <th className="px-4 py-3 text-right font-medium">{tx("Actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {myGrants.map((g) => (
                        <tr key={g.id} className="border-b border-border/50 last:border-0">
                          <td className="px-4 py-3 font-medium text-foreground">{g.title}</td>
                          <td className="px-4 py-3">
                            <StatusBadge status={g.status} />
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-primary">
                            ${g.amount.toLocaleString(uiLocale)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(g.submittedDate).toLocaleDateString(uiLocale)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/grants/${g.id}`}>
                              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                                {tx("View ")}<ChevronRight className="h-3 w-3" />
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones">
          <div className="space-y-3">
            {login === undefined ? (
              <p className="text-sm text-muted-foreground">{tx("Checking GitHub session…")}</p>
            ) : login === null ? (
              <p className="text-sm text-muted-foreground">
                {tx("Connect GitHub to see milestones for your grants.")}</p>
            ) : milestoneRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {tx("No open milestones for your active grants, or you have no active grants yet.")}</p>
            ) : (
              milestoneRows.map(({ grant, milestone: m }) => (
                <Card key={`${grant.id}-${m.number}`} className="border-border/50 bg-card">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">{grant.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>{tx("Milestone ")}{m.number}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {tx(" Due:")}{" "}
                          {new Date(m.dueDate).toLocaleDateString(uiLocale)}
                        </span>
                        <span>${m.amount.toLocaleString(uiLocale)}</span>
                      </div>
                    </div>
                    {grant.githubLink ? (
                      <Button size="sm" variant="outline" className="shrink-0 gap-1" asChild>
                        <a href={grant.githubLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                          {tx("Open on GitHub")}</a>
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" disabled className="shrink-0">
                        {tx("No issue link")}</Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <WatchlistPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
