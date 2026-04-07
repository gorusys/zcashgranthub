import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Users, Settings, Github, Tag, RefreshCw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const users = [
  { name: "aiyadt", email: "aiyadt@zcg.org", role: "Committee", github: "aiyadt", joined: "2024-01-15" },
  { name: "decentralistdan", email: "dan@zcg.org", role: "Committee", github: "decentralistdan", joined: "2024-01-15" },
  { name: "aquietinvestor", email: "quiet@zcg.org", role: "Committee", github: "aquietinvestor", joined: "2024-03-01" },
  { name: "zancas", email: "zancas@example.com", role: "Applicant", github: "zancas", joined: "2025-12-01" },
];

export default function AdminPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-center">
        <span className="text-sm font-medium text-destructive">Admin Panel — Restricted Access</span>
      </div>

      <h1 className="mb-8 text-3xl font-bold text-foreground">Admin Panel</h1>

      <Tabs defaultValue="users">
        <TabsList className="mb-6 bg-secondary">
          <TabsTrigger value="users" className="gap-2"><Users className="h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="sync" className="gap-2"><Github className="h-4 w-4" /> GitHub Sync</TabsTrigger>
          <TabsTrigger value="settings" className="gap-2"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card className="border-border/50 bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      <th className="px-4 py-3 text-left font-medium">Name</th>
                      <th className="px-4 py-3 text-left font-medium">Email</th>
                      <th className="px-4 py-3 text-left font-medium">Role</th>
                      <th className="px-4 py-3 text-left font-medium">GitHub</th>
                      <th className="px-4 py-3 text-left font-medium">Joined</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.name} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${u.role === "Committee" ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">@{u.github}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(u.joined).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-right">
                          <Select defaultValue={u.role.toLowerCase()}>
                            <SelectTrigger className="w-[120px] bg-secondary h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="applicant">Applicant</SelectItem>
                              <SelectItem value="committee">Committee</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sync">
          <Card className="border-border/50 bg-card">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">Last Sync</div>
                  <div className="text-xs text-muted-foreground">April 7, 2026 at 10:30 AM UTC</div>
                </div>
                <Button className="gap-2"><RefreshCw className="h-4 w-4" /> Run Full Import</Button>
              </div>
              <div className="space-y-2 mt-4">
                {["Synced 6 grants from GitHub Issues", "Updated milestone statuses", "No new comments found"].map((log, i) => (
                  <div key={i} className="text-xs text-muted-foreground border-l-2 border-border pl-3 py-1">{log}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-4">
            <Card className="border-border/50 bg-card">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <div className="text-sm font-medium text-foreground">Grant Submissions</div>
                  <div className="text-xs text-muted-foreground">Allow new grant applications</div>
                </div>
                <Switch defaultChecked />
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card">
              <CardContent className="p-5">
                <div className="text-sm font-medium text-foreground mb-2">ZEC/USD Price Override</div>
                <Input placeholder="Leave blank for live price" className="bg-secondary" />
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card">
              <CardContent className="p-5">
                <div className="text-sm font-medium text-foreground mb-2">KYC Threshold (USD)</div>
                <Input type="number" defaultValue="25000" className="bg-secondary" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
