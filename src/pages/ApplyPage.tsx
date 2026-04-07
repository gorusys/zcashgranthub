import { useState } from "react";
import { Check, ChevronRight, ChevronLeft, Save, Upload, Plus, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const stepLabels = [
  "Terms & Conditions",
  "Organization",
  "Project Overview",
  "Project Lead",
  "Project Details",
  "Budget",
  "Risk Assessment",
  "Schedule & Milestones",
  "Supporting Documents",
  "Review & Submit",
];

const terms = [
  "I have read and agree to the ZCG Grant Terms and Conditions",
  "I understand that all grant work must be open source",
  "I agree to provide regular milestone reports",
  "I understand that funding is milestone-based",
  "I confirm that I am not on any sanctions list",
  "I agree to KYC requirements for grants above $25,000",
  "I understand the committee may request revisions",
  "I agree to the ZCG Code of Conduct",
  "I confirm all information provided is accurate",
];

const categories = [
  "Infrastructure", "Community", "Education", "Non-Wallet Applications", "Integration",
  "Wallets", "Research & Development", "Media", "Zcash Protocol Extension", "Dedicated Resource", "Event Sponsorships",
];

export default function ApplyPage() {
  const [step, setStep] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState<boolean[]>(new Array(9).fill(false));
  const [formData, setFormData] = useState({
    github: "", org: "", howLearn: "",
    title: "", amount: "", category: "",
    leadName: "", leadRole: "", leadBg: "", leadResp: "",
    summary: "", description: "", problem: "", solution: "",
    solutionFormat: "", dependencies: "", techApproach: "", upstream: "",
    hardware: "0", services: "0", compensation: "0",
    prevFunding: "no", otherFunding: "no",
    implRisks: "", sideEffects: "", successMetrics: "",
    startupAmount: "0", startupJustification: "",
  });
  const [teamMembers, setTeamMembers] = useState<{ name: string; role: string; bg: string; resp: string }[]>([]);
  const [milestones, setMilestones] = useState<{ amount: string; date: string; stories: string[]; deliverables: string[]; criteria: string }[]>([]);
  const [documents, setDocuments] = useState<{ name: string; url: string; desc: string }[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const updateField = (key: string, val: string) => setFormData(prev => ({ ...prev, [key]: val }));
  const total = Number(formData.hardware) + Number(formData.services) + Number(formData.compensation);

  const addMilestone = () => setMilestones(prev => [...prev, { amount: "", date: "", stories: [""], deliverables: [""], criteria: "" }]);
  const removeMilestone = (i: number) => setMilestones(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <h1 className="mb-1 text-2xl font-bold text-foreground sm:text-3xl">Submit a Grant Application</h1>
      <p className="mb-6 text-sm text-muted-foreground sm:mb-8 sm:text-base">
        Complete all steps to submit your proposal for ZCG funding.
      </p>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        {/* Step list — vertical on all screen sizes, stacks above form on mobile */}
        <nav className="w-full shrink-0 lg:w-56 xl:w-64">
          <div className="space-y-0.5 lg:sticky lg:top-24">
            {stepLabels.map((label, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  i === step
                    ? "bg-primary/10 font-medium text-primary"
                    : i < step
                    ? "text-foreground hover:bg-secondary/50"
                    : "text-muted-foreground hover:bg-secondary/50"
                )}
              >
                <div className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}>
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                {label}
              </button>
            ))}
          </div>
        </nav>

        {/* Form */}
        <div className="flex-1">

          {/* Step 0: Terms */}
          {step === 0 && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 sm:space-y-4 sm:px-6 sm:pb-6">
                {terms.map((term, i) => (
                  <label key={i} className="flex cursor-pointer items-start gap-3">
                    <Checkbox checked={termsAccepted[i]} onCheckedChange={() => setTermsAccepted(prev => { const n = [...prev]; n[i] = !n[i]; return n; })} className="mt-0.5" />
                    <span className="text-sm text-muted-foreground">{term}</span>
                  </label>
                ))}
                <p className="text-xs text-muted-foreground">All terms must be accepted to proceed.</p>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Organization */}
          {step === 1 && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                <CardTitle>Organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 sm:space-y-4 sm:px-6 sm:pb-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">GitHub Username</label>
                  <Input value={formData.github} onChange={e => updateField("github", e.target.value)} placeholder="your-github-handle" className="bg-secondary" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Organization Name</label>
                  <Input value={formData.org} onChange={e => updateField("org", e.target.value)} placeholder="Your Organization" className="bg-secondary" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">How did you learn about ZCG?</label>
                  <Textarea value={formData.howLearn} onChange={e => updateField("howLearn", e.target.value)} className="bg-secondary" />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Project Overview */}
          {step === 2 && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                <CardTitle>Project Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 sm:space-y-4 sm:px-6 sm:pb-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Grant Title *</label>
                  <Input value={formData.title} onChange={e => updateField("title", e.target.value)} placeholder="Enter your grant title" className="bg-secondary" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Requested Amount (USD) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input type="number" value={formData.amount} onChange={e => updateField("amount", e.target.value)} className="bg-secondary pl-7" />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Category *</label>
                  <Select value={formData.category} onValueChange={v => updateField("category", v)}>
                    <SelectTrigger className="bg-secondary"><SelectValue placeholder="Select a category" /></SelectTrigger>
                    <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Project Lead */}
          {step === 3 && (
            <div className="space-y-3 sm:space-y-4">
              <Card className="border-border/50 bg-card">
                <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                  <CardTitle>Project Lead</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
                  <Input placeholder="Name" value={formData.leadName} onChange={e => updateField("leadName", e.target.value)} className="bg-secondary" />
                  <Input placeholder="Role" value={formData.leadRole} onChange={e => updateField("leadRole", e.target.value)} className="bg-secondary" />
                  <Textarea placeholder="Background" value={formData.leadBg} onChange={e => updateField("leadBg", e.target.value)} className="bg-secondary" />
                  <Textarea placeholder="Responsibilities" value={formData.leadResp} onChange={e => updateField("leadResp", e.target.value)} className="bg-secondary" />
                </CardContent>
              </Card>
              {teamMembers.map((m, i) => (
                <Card key={i} className="border-border/50 bg-card">
                  <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                    <CardTitle className="text-base">Team Member {i + 1}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setTeamMembers(prev => prev.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
                    <Input placeholder="Name" value={m.name} onChange={e => setTeamMembers(prev => { const n = [...prev]; n[i] = { ...n[i], name: e.target.value }; return n; })} className="bg-secondary" />
                    <Input placeholder="Role" value={m.role} onChange={e => setTeamMembers(prev => { const n = [...prev]; n[i] = { ...n[i], role: e.target.value }; return n; })} className="bg-secondary" />
                    <Textarea placeholder="Responsibilities" value={m.resp} onChange={e => setTeamMembers(prev => { const n = [...prev]; n[i] = { ...n[i], resp: e.target.value }; return n; })} className="bg-secondary" />
                  </CardContent>
                </Card>
              ))}
              {teamMembers.length < 6 && (
                <Button variant="outline" onClick={() => setTeamMembers(prev => [...prev, { name: "", role: "", bg: "", resp: "" }])} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Team Member
                </Button>
              )}
            </div>
          )}

          {/* Step 4: Project Details */}
          {step === 4 && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                <CardTitle>Project Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 sm:space-y-4 sm:px-6 sm:pb-6">
                {[
                  ["summary", "Project Summary *"], ["description", "Project Description *"], ["problem", "Proposed Problem *"],
                  ["solution", "Proposed Solution *"], ["solutionFormat", "Solution Format"], ["dependencies", "Dependencies"],
                  ["techApproach", "Technical Approach *"], ["upstream", "Upstream Merge Opportunities"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>
                    <Textarea value={(formData as any)[key]} onChange={e => updateField(key, e.target.value)} className="min-h-[90px] bg-secondary sm:min-h-[100px]" />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Step 5: Budget */}
          {step === 5 && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                <CardTitle>Budget</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 sm:space-y-4 sm:px-6 sm:pb-6">
                {[["hardware", "Hardware/Software"], ["services", "Services"], ["compensation", "Compensation"]].map(([key, label]) => (
                  <div key={key}>
                    <label className="mb-1 block text-sm font-medium text-foreground">{label}</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                      <Input type="number" value={(formData as any)[key]} onChange={e => updateField(key, e.target.value)} className="bg-secondary pl-7" />
                    </div>
                  </div>
                ))}
                <div className="rounded-lg bg-secondary p-3 text-center sm:p-4">
                  <span className="text-sm text-muted-foreground">Total Budget</span>
                  <div className="text-2xl font-bold text-primary">${total.toLocaleString()}</div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 6: Risk */}
          {step === 6 && (
            <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
              {[["implRisks", "Implementation Risks"], ["sideEffects", "Potential Side Effects"], ["successMetrics", "Success Metrics"]].map(([key, label]) => (
                <Card key={key} className="border-border/50 bg-card">
                  <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                    <CardTitle className="text-sm">{label}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
                    <Textarea value={(formData as any)[key]} onChange={e => updateField(key, e.target.value)} className="min-h-[100px] bg-secondary sm:min-h-[120px]" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Step 7: Milestones */}
          {step === 7 && (
            <div className="space-y-3 sm:space-y-4">
              <Card className="border-border/50 bg-card">
                <CardContent className="px-4 py-3 sm:px-6 sm:py-5">
                  <label className="mb-1 block text-sm font-medium text-foreground">Startup Funding</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <Input type="number" value={formData.startupAmount} onChange={e => updateField("startupAmount", e.target.value)} className="bg-secondary pl-7" />
                  </div>
                </CardContent>
              </Card>
              {milestones.map((m, i) => (
                <Card key={i} className="border-border/50 bg-card">
                  <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                    <CardTitle className="text-base">Milestone {i + 1}</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => removeMilestone(i)}><X className="h-4 w-4" /></Button>
                  </CardHeader>
                  <CardContent className="space-y-3 px-4 pb-4 sm:px-6 sm:pb-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Amount (USD)</label>
                        <Input type="number" value={m.amount} onChange={e => setMilestones(prev => { const n = [...prev]; n[i] = { ...n[i], amount: e.target.value }; return n; })} className="bg-secondary" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-muted-foreground">Expected Completion</label>
                        <Input type="date" value={m.date} onChange={e => setMilestones(prev => { const n = [...prev]; n[i] = { ...n[i], date: e.target.value }; return n; })} className="bg-secondary" />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Acceptance Criteria</label>
                      <Textarea value={m.criteria} onChange={e => setMilestones(prev => { const n = [...prev]; n[i] = { ...n[i], criteria: e.target.value }; return n; })} className="bg-secondary" />
                    </div>
                  </CardContent>
                </Card>
              ))}
              <Button variant="outline" onClick={addMilestone} className="gap-2">
                <Plus className="h-4 w-4" /> Add Milestone
              </Button>
            </div>
          )}

          {/* Step 8: Documents */}
          {step === 8 && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                <CardTitle>Supporting Documents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 sm:space-y-4 sm:px-6 sm:pb-6">
                <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/50 p-6 sm:p-10">
                  <div className="text-center">
                    <Upload className="mx-auto mb-2 h-7 w-7 text-muted-foreground sm:h-8 sm:w-8" />
                    <p className="text-sm text-muted-foreground">Drag & drop files or click to upload</p>
                  </div>
                </div>
                {documents.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input placeholder="Name" value={d.name} onChange={e => setDocuments(prev => { const n = [...prev]; n[i] = { ...n[i], name: e.target.value }; return n; })} className="bg-secondary" />
                    <Input placeholder="URL" value={d.url} onChange={e => setDocuments(prev => { const n = [...prev]; n[i] = { ...n[i], url: e.target.value }; return n; })} className="bg-secondary" />
                    <Button variant="ghost" size="icon" onClick={() => setDocuments(prev => prev.filter((_, idx) => idx !== i))}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
                <Button variant="outline" onClick={() => setDocuments(prev => [...prev, { name: "", url: "", desc: "" }])} className="gap-2">
                  <Plus className="h-4 w-4" /> Add URL
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 9: Review */}
          {step === 9 && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                <CardTitle>Review & Submit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:space-y-6 sm:px-6 sm:pb-6">
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <div><span className="text-xs text-muted-foreground">Title</span><p className="font-medium text-foreground">{formData.title || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Amount</span><p className="font-medium text-primary">${Number(formData.amount).toLocaleString() || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Category</span><p className="font-medium text-foreground">{formData.category || "—"}</p></div>
                  <div><span className="text-xs text-muted-foreground">Project Lead</span><p className="font-medium text-foreground">{formData.leadName || "—"}</p></div>
                </div>
                <div><span className="text-xs text-muted-foreground">Summary</span><p className="text-sm text-muted-foreground">{formData.summary || "—"}</p></div>
                <div className="rounded-lg bg-secondary p-3 text-center sm:p-4">
                  <span className="text-sm text-muted-foreground">Total Budget</span>
                  <div className="text-2xl font-bold text-primary">${total.toLocaleString()}</div>
                  <span className="text-xs text-muted-foreground">{milestones.length} milestones</span>
                </div>
                <label className="flex cursor-pointer items-center gap-3">
                  <Checkbox checked={confirmed} onCheckedChange={() => setConfirmed(!confirmed)} />
                  <span className="text-sm text-foreground">I confirm all information is accurate</span>
                </label>
                <Button size="lg" disabled={!confirmed} className="w-full gap-2 bg-primary font-semibold text-primary-foreground">
                  <FileText className="h-4 w-4" /> Submit Grant Application
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4 sm:mt-6 sm:pt-6">
            <Button variant="outline" size="sm" className="gap-1 text-muted-foreground">
              <Save className="h-3.5 w-3.5" /> Save Draft
            </Button>
            <div className="flex gap-2 sm:gap-3">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
              )}
              {step < 9 && (
                <Button onClick={() => setStep(step + 1)} className="gap-1 bg-primary text-primary-foreground">
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
