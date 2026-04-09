import { useState } from "react";
import { Bell, FileText, LayoutDashboard, ChevronRight, Clock, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { useGrants } from "@/hooks/useGrants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import Link from "next/link";

const notifications = [
  { id: 1, message: "Your grant 'ZAP1 Protocol Hardening' milestone 1 has been approved", time: "2 hours ago", read: false },
  { id: 2, message: "New comment on 'Zcash Ghana Community Outreach'", time: "1 day ago", read: false },
  { id: 3, message: "Committee review scheduled for your application", time: "3 days ago", read: true },
];

export default function DashboardPage() {
  const { data: grants = [], isLoading } = useGrants();
  const [activeTab, setActiveTab] = useState("applications");

  // Show first 10 as "my applications" placeholder (no auth yet)
  const myGrants = grants.slice(0, 10);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-foreground">Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 bg-secondary">
          <TabsTrigger value="applications" className="gap-2"><LayoutDashboard className="h-4 w-4" /> My Applications</TabsTrigger>
          <TabsTrigger value="milestones" className="gap-2"><FileText className="h-4 w-4" /> Milestone Reports</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 relative">
            <Bell className="h-4 w-4" /> Notifications
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">2</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="applications">
          <Card className="border-border/50 bg-card">
            <CardContent className="p-0">
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
                    {myGrants.map(g => (
                      <tr key={g.id} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3 font-medium text-foreground">{g.title}</td>
                        <td className="px-4 py-3"><StatusBadge status={g.status} /></td>
                        <td className="px-4 py-3 text-right text-primary font-medium">${g.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(g.submittedDate).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/grants/${g.id}`}>
                            <Button variant="ghost" size="sm" className="gap-1 text-primary">View <ChevronRight className="h-3 w-3" /></Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones">
          <div className="space-y-3">
            {myGrants.filter(g => g.status === "ACTIVE").flatMap(g =>
              g.milestones.filter(m => m.status !== "Paid").map(m => (
                <Card key={`${g.id}-${m.number}`} className="border-border/50 bg-card">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <div className="text-sm font-medium text-foreground">{g.title}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>Milestone {m.number}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Due: {new Date(m.dueDate).toLocaleDateString()}</span>
                        <span>${m.amount.toLocaleString()}</span>
                      </div>
                    </div>
                    <Button size="sm" className="gap-1"><Send className="h-3 w-3" /> Submit Report</Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <div className="space-y-2">
            {notifications.map(n => (
              <Card key={n.id} className={cn("border-border/50", n.read ? "bg-card" : "bg-card border-l-2 border-l-primary")}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className={cn("text-sm", n.read ? "text-muted-foreground" : "text-foreground font-medium")}>{n.message}</p>
                    <span className="text-xs text-muted-foreground">{n.time}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
