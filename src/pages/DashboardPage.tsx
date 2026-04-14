import { useEffect, useMemo, useState } from "react";
import { Bell, FileText, LayoutDashboard, ChevronRight, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useGrants } from "@/hooks/useGrants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { readGitHubSession, subscribeToGitHubAuth } from "@/lib/githubAuth";

export default function DashboardPage() {
  const { data: grants = [], isLoading } = useGrants();
  const [activeTab, setActiveTab] = useState("applications");
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
      <h1 className="mb-8 text-3xl font-bold text-foreground">Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-secondary">
          <TabsTrigger value="applications" className="gap-2">
            <LayoutDashboard className="h-4 w-4" /> My Applications
          </TabsTrigger>
          <TabsTrigger value="milestones" className="gap-2">
            <FileText className="h-4 w-4" /> Milestone Reports
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" /> Notifications
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <Card className="border-border/50 bg-card">
            <CardContent className="p-0">
              {login === undefined ? (
                <div className="p-6 text-sm text-muted-foreground">Checking GitHub session…</div>
              ) : login === null ? (
                <div className="p-6 text-sm text-muted-foreground">
                  <p className="mb-3">
                    Connect GitHub with the same account you use on grant issues so we can list
                    applications where you are the GitHub author.
                  </p>
                  <p className="text-xs">
                    Grant rows are matched by the issue author field from GitHub—not by email.
                  </p>
                </div>
              ) : isLoading ? (
                <div className="p-6 text-sm text-muted-foreground">Loading grants from GitHub…</div>
              ) : myGrants.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">
                  No grants found for <span className="font-mono text-foreground">@{login}</span>{" "}
                  in the configured repos. Open an application from{" "}
                  <Link href="/apply" className="text-primary underline-offset-2 hover:underline">
                    Apply
                  </Link>{" "}
                  or browse{" "}
                  <Link href="/grants" className="text-primary underline-offset-2 hover:underline">
                    Grants
                  </Link>
                  .
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="px-4 py-3 text-left font-medium">Title</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-right font-medium">Amount</th>
                        <th className="px-4 py-3 text-left font-medium">Submitted</th>
                        <th className="px-4 py-3 text-right font-medium">Actions</th>
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
                            ${g.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(g.submittedDate).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link href={`/grants/${g.id}`}>
                              <Button variant="ghost" size="sm" className="gap-1 text-primary">
                                View <ChevronRight className="h-3 w-3" />
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
              <p className="text-sm text-muted-foreground">Checking GitHub session…</p>
            ) : login === null ? (
              <p className="text-sm text-muted-foreground">
                Connect GitHub to see milestones for your grants.
              </p>
            ) : milestoneRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No open milestones for your active grants, or you have no active grants yet.
              </p>
            ) : (
              milestoneRows.map(({ grant, milestone: m }) => (
                <Card key={`${grant.id}-${m.number}`} className="border-border/50 bg-card">
                  <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-medium text-foreground">{grant.title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span>Milestone {m.number}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Due:{" "}
                          {new Date(m.dueDate).toLocaleDateString()}
                        </span>
                        <span>${m.amount.toLocaleString()}</span>
                      </div>
                    </div>
                    {grant.githubLink ? (
                      <Button size="sm" variant="outline" className="shrink-0 gap-1" asChild>
                        <a href={grant.githubLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                          Open on GitHub
                        </a>
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" disabled className="shrink-0">
                        No issue link
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="border-border/50 bg-card">
            <CardContent className="p-6 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">No in-app notifications yet</p>
              <p>
                Watch your grant issue on GitHub and the Zcash Community Forum for review updates.
                This hub does not poll GitHub for comments or labels into a notification feed yet.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
