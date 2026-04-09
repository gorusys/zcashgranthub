import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useGrants } from "@/hooks/useGrants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, XCircle, MinusCircle, AlertTriangle, Clock, Users } from "lucide-react";
import Link from "next/link";

export default function CommitteePage() {
  const { data: grants = [], isLoading } = useGrants();
  const reviewQueue = grants.filter((g) =>
    ["PENDING_REVIEW", "COMMUNITY_REVIEW", "COMMITTEE_REVIEW"].includes(g.status)
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-center">
        <span className="text-sm font-medium text-destructive">Committee View — Restricted Access</span>
      </div>

      <h1 className="mb-8 text-3xl font-bold text-foreground">Committee Dashboard</h1>

      <Tabs defaultValue="queue">
        <TabsList className="mb-6 bg-secondary">
          <TabsTrigger value="queue" className="gap-2"><Clock className="h-4 w-4" /> Review Queue</TabsTrigger>
          <TabsTrigger value="minutes" className="gap-2"><Users className="h-4 w-4" /> Meeting Minutes</TabsTrigger>
        </TabsList>

        <TabsContent value="queue">
          <Card className="border-border/50 bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="px-4 py-3 text-left font-medium">Title</th>
                      <th className="px-4 py-3 text-left font-medium">Applicant</th>
                      <th className="px-4 py-3 text-left font-medium">Category</th>
                      <th className="px-4 py-3 text-right font-medium">Amount</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewQueue.map(g => (
                      <tr key={g.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/50">
                        <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{g.title}</td>
                        <td className="px-4 py-3 text-muted-foreground">{g.applicant}</td>
                        <td className="px-4 py-3 text-muted-foreground">{g.category}</td>
                        <td className="px-4 py-3 text-right text-primary font-medium">${g.amount.toLocaleString()}</td>
                        <td className="px-4 py-3"><StatusBadge status={g.status} /></td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" className="text-xs">Assign to Me</Button>
                            <Link href={`/grants/${g.id}`}><Button size="sm" className="text-xs">Review</Button></Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Vote panel example */}
          <Card className="mt-6 border-border/50 bg-card">
            <CardHeader><CardTitle className="text-base">Quick Vote Panel</CardTitle></CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">Select a grant from the queue above to vote.</p>
              <div className="flex flex-wrap gap-3">
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-foreground"><CheckCircle2 className="h-4 w-4" /> Approve</Button>
                <Button className="gap-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground"><XCircle className="h-4 w-4" /> Reject</Button>
                <Button variant="secondary" className="gap-2"><MinusCircle className="h-4 w-4" /> Abstain</Button>
                <Button variant="outline" className="gap-2"><AlertTriangle className="h-4 w-4" /> Needs Revision</Button>
              </div>
              <Textarea placeholder="Required: Add a comment with your vote..." className="mt-4 bg-secondary" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="minutes">
          <div className="space-y-4">
            {[
              { date: "March 25, 2026", summary: "Reviewed 3 grants. Approved Zebra Fuzzing, tabled Mastering Zcash for revision.", grants: ["3", "2"] },
              { date: "March 11, 2026", summary: "Reviewed 2 grants. Discussed ZecShield bridge security concerns.", grants: ["6"] },
            ].map((m, i) => (
              <Card key={i} className="border-border/50 bg-card">
                <CardContent className="p-5">
                  <div className="mb-2 text-sm font-semibold text-primary">{m.date}</div>
                  <p className="text-sm text-muted-foreground">{m.summary}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
