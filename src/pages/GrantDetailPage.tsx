import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Share2,
  Calendar,
  Clock,
  Github,
  MessageSquare,
  FileText,
  AlertTriangle,
  ChevronDown,
  AlertCircle,
  Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import { MilestoneProgressBar } from "@/components/MilestoneProgressBar";
import { useGrant } from "@/hooks/useGrants";
import { useState } from "react";

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DetailSkeleton() {
  return (
    <div className="container mx-auto animate-pulse px-4 py-8">
      <div className="mb-6 h-4 w-24 rounded bg-secondary" />
      <div className="mb-3 flex gap-2">
        <div className="h-5 w-24 rounded-full bg-secondary" />
        <div className="h-5 w-20 rounded-full bg-secondary" />
      </div>
      <div className="mb-2 h-8 w-full rounded bg-secondary sm:w-2/3" />
      <div className="h-4 w-1/2 rounded bg-secondary sm:w-1/3" />
      <div className="mt-6 h-20 w-full rounded-lg bg-secondary" />
      <div className="mt-4 h-10 w-full rounded-lg bg-secondary" />
      <div className="mt-6 h-64 w-full rounded-lg bg-secondary" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible section
// ---------------------------------------------------------------------------

function CollapsibleSection({
  id: sectionId,
  title,
  content,
  expanded,
  onToggle,
}: {
  id: string;
  title: string;
  content: string;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => onToggle(sectionId)}
        className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-foreground transition-colors hover:text-primary"
      >
        <span>{title}</span>
        <ChevronDown
          className={`ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>
      {expanded && (
        <p className="pb-4 text-sm leading-relaxed text-muted-foreground break-words whitespace-pre-line">
          {content || <span className="italic">Not provided</span>}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const TABS = [
  { value: "overview",   label: "Overview"  },
  { value: "team",       label: "Team"      },
  { value: "budget",     label: "Budget"    },
  { value: "milestones", label: "Milestones"},
  { value: "risk",       label: "Risk"      },
  { value: "discussion", label: "Discussion"},
  { value: "documents",  label: "Documents" },
];

export default function GrantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: grant, isLoading, isError, error } = useGrant(id);
  const [expandedSections, setExpandedSections] = useState<string[]>(["description"]);
  const [daoDemoStatus, setDaoDemoStatus] = useState<
    "DRAFT" | "IN_VOTING" | "PASSED" | "REJECTED"
  >("IN_VOTING");

  const toggleSection = (s: string) =>
    setExpandedSections((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  // ── loading ──────────────────────────────────────────────────────────────
  if (isLoading) return <DetailSkeleton />;

  // ── error ─────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-400" />
        <h1 className="text-2xl font-bold text-foreground">Could not load grant</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          {(error as Error)?.message ?? "Failed to fetch from GitHub API."}
        </p>
        <Link to="/grants">
          <Button variant="outline" className="mt-6">Back to Grants</Button>
        </Link>
      </div>
    );
  }

  // ── not found ─────────────────────────────────────────────────────────────
  if (!grant) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground">Grant not found</h1>
        <Link to="/grants">
          <Button variant="outline" className="mt-4">Back to Grants</Button>
        </Link>
      </div>
    );
  }

  // ── helpers ───────────────────────────────────────────────────────────────
  const daodaoUrl = "https://daodao.zone";

  const milestoneStatusBadge = (status: string) => {
    if (status === "Paid")        return "COMPLETED" as const;
    if (status === "In Progress") return "ACTIVE"    as const;
    return "PENDING_REVIEW" as const;
  };

  const daoStatusMeta: Record<
    "DRAFT" | "IN_VOTING" | "PASSED" | "REJECTED",
    { label: string; className: string }
  > = {
    DRAFT: {
      label: "Draft",
      className: "bg-secondary text-muted-foreground",
    },
    IN_VOTING: {
      label: "In Voting",
      className: "bg-blue-500/20 text-blue-300",
    },
    PASSED: {
      label: "Passed",
      className: "bg-emerald-500/20 text-emerald-300",
    },
    REJECTED: {
      label: "Rejected",
      className: "bg-red-500/20 text-red-300",
    },
  };

  const demoVotes = {
    yes: 68,
    no: 21,
    abstain: 11,
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="container mx-auto min-w-0 px-4 py-6 sm:py-8">
      {/* Back link */}
      <Link
        to="/grants"
        className="mb-5 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Grants
      </Link>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="mb-6">
        {/* Badges row */}
        <div className="mb-3 flex flex-wrap gap-2">
          <StatusBadge status={grant.status} />
          <CategoryBadge category={grant.category} />
        </div>

        {/* Title + amount row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold leading-tight text-foreground sm:text-2xl lg:text-3xl">
              {grant.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <img
                  src={grant.applicantAvatar}
                  alt={grant.applicant}
                  className="h-5 w-5 rounded-full"
                />
                <a
                  href={`https://github.com/${grant.githubUsername}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-primary hover:underline"
                >
                  @{grant.applicant}
                </a>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 shrink-0" />
                {new Date(grant.submittedDate).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 shrink-0" />
                Updated {new Date(grant.lastUpdated).toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Amount + share */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="text-left sm:text-right">
              <div className="text-xs text-muted-foreground">Requested</div>
              <div className="text-xl font-bold text-primary sm:text-2xl">
                {grant.amount > 0 ? `$${grant.amount.toLocaleString()}` : "TBD"}
              </div>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              title="Copy link"
              onClick={() => navigator.clipboard.writeText(window.location.href)}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Workflow stepper ──────────────────────────────────────────────── */}
      <Card className="mb-6 border-border/50 bg-card">
        <CardContent className="p-3 sm:p-4">
          <WorkflowStepper status={grant.status} />
        </CardContent>
      </Card>

      {/* ── Governance bridge (UI-first) ─────────────────────────────────── */}
      <Card className="mb-6 border-border/50 bg-card/70">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Governance Pulse
            </p>
          </div>
          <Button variant="outline" size="sm" className="shrink-0 gap-2" asChild>
            <a href={daodaoUrl} target="_blank" rel="noopener noreferrer">
              <Scale className="h-4 w-4" />
              Open DAODAO
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* ── Mobile quick-actions (shows above tabs on small screens) ────── */}
      <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-hide pb-1 lg:hidden">
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs" asChild>
          <a href={grant.forumLink} target="_blank" rel="noopener noreferrer">
            <MessageSquare className="h-3.5 w-3.5" /> Forum
          </a>
        </Button>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs" asChild>
          <a href={grant.githubLink} target="_blank" rel="noopener noreferrer">
            <Github className="h-3.5 w-3.5" /> GitHub Issue
          </a>
        </Button>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5 text-xs" asChild>
          <a href="https://forum.zcashcommunity.com/c/grants/33" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" /> Contact ZCG
          </a>
        </Button>
      </div>

      {/* ── Content + sidebar ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-6 lg:flex-row">

        {/* Main */}
        <div className="min-w-0 flex-1">
          <Tabs defaultValue="overview">
            {/* Scrollable tab list — never wraps */}
            <div className="scrollbar-hide mb-4 overflow-x-auto">
              <TabsList className="inline-flex h-10 w-max min-w-full bg-secondary">
                {TABS.map((t) => (
                  <TabsTrigger
                    key={t.value}
                    value={t.value}
                    className="px-3 text-xs sm:px-4 sm:text-sm"
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ── Overview ─────────────────────────────────────────── */}
            <TabsContent value="overview">
              <Card className="border-border/50 bg-card">
                <CardContent className="p-4 sm:p-5">
                  {grant.summary && (
                    <p className="mb-4 break-words text-sm leading-relaxed text-muted-foreground">
                      {grant.summary}
                    </p>
                  )}
                  {[
                    { id: "description", title: "Project Description",          content: grant.description      },
                    { id: "problem",     title: "Proposed Problem",              content: grant.problem          },
                    { id: "solution",    title: "Proposed Solution",             content: grant.solution         },
                    { id: "format",      title: "Solution Format",               content: grant.solutionFormat   },
                    { id: "deps",        title: "Dependencies",                  content: grant.dependencies     },
                    { id: "tech",        title: "Technical Approach",            content: grant.technicalApproach},
                    { id: "upstream",    title: "Upstream Merge Opportunities",  content: grant.upstreamMerge   },
                  ].map((s) => (
                    <CollapsibleSection
                      key={s.id}
                      id={s.id}
                      title={s.title}
                      content={s.content}
                      expanded={expandedSections.includes(s.id)}
                      onToggle={toggleSection}
                    />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Team ─────────────────────────────────────────────── */}
            <TabsContent value="team">
              <Card className="mb-4 border-border/50 bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Project Lead</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/20 text-base font-bold text-primary sm:h-12 sm:w-12">
                      {grant.teamLead.name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">{grant.teamLead.name}</div>
                      <div className="text-sm text-primary">{grant.teamLead.role}</div>
                      {grant.teamLead.background && (
                        <p className="mt-2 break-words text-sm text-muted-foreground">
                          {grant.teamLead.background}
                        </p>
                      )}
                      {grant.teamLead.responsibilities && (
                        <p className="mt-1 break-words text-sm text-muted-foreground">
                          <strong className="text-foreground/80">Responsibilities:</strong>{" "}
                          {grant.teamLead.responsibilities}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {grant.teamMembers.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {grant.teamMembers.map((m, i) => (
                    <Card key={i} className="border-border/50 bg-card">
                      <CardContent className="p-4">
                        <div className="mb-2 flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                            {m.name[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{m.name}</div>
                            <div className="truncate text-xs text-primary">{m.role}</div>
                          </div>
                        </div>
                        <p className="break-words text-sm text-muted-foreground">{m.responsibilities}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {grant.teamMembers.length === 0 && (
                <p className="py-4 text-sm text-muted-foreground">No additional team members listed.</p>
              )}
            </TabsContent>

            {/* ── Budget ───────────────────────────────────────────── */}
            <TabsContent value="budget">
              <Card className="border-border/50 bg-card">
                <CardContent className="p-4 sm:p-5">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[280px] text-sm">
                      <thead>
                        <tr className="border-b border-border/50 text-muted-foreground">
                          <th className="pb-2 text-left font-medium">Category</th>
                          <th className="pb-2 text-right font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(
                          [
                            ["Hardware / Software", grant.budget.hardware],
                            ["Services",            grant.budget.services],
                            ["Compensation",        grant.budget.compensation],
                          ] as [string, number][]
                        ).map(([cat, amt]) => (
                          <tr key={cat} className="border-b border-border/50">
                            <td className="py-3 text-foreground">{cat}</td>
                            <td className="py-3 text-right text-foreground">${amt.toLocaleString()}</td>
                          </tr>
                        ))}
                        <tr className="font-bold">
                          <td className="pt-3 text-foreground">Total</td>
                          <td className="pt-3 text-right text-primary">
                            ${grant.budget.total.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── Milestones ───────────────────────────────────────── */}
            <TabsContent value="milestones">
              {grant.milestones.length > 0 ? (
                <>
                  <Card className="mb-4 border-border/50 bg-card">
                    <CardContent className="p-4 sm:p-5">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">
                          {grant.milestonesCompleted} of {grant.totalMilestones} milestones paid
                        </span>
                        <span className="font-medium text-primary">
                          ${grant.amountPaid.toLocaleString()} of ${grant.amount.toLocaleString()}
                        </span>
                      </div>
                      <MilestoneProgressBar milestones={grant.milestones} />
                    </CardContent>
                  </Card>

                  <div className="space-y-3">
                    {grant.milestones.map((m) => (
                      <Card key={m.number} className="border-border/50 bg-card">
                        <CardContent className="p-4 sm:p-5">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <h3 className="font-semibold text-foreground">Milestone {m.number}</h3>
                            <StatusBadge status={milestoneStatusBadge(m.status)} />
                          </div>
                          <div className="mb-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="font-medium text-primary">${m.amount.toLocaleString()}</span>
                            {m.dueDate && (
                              <span>Due: {new Date(m.dueDate).toLocaleDateString()}</span>
                            )}
                          </div>
                          {m.userStories.length > 0 && (
                            <div className="mb-3">
                              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                User Stories
                              </div>
                              <ul className="space-y-1 pl-4 text-sm text-muted-foreground">
                                {m.userStories.map((s, i) => (
                                  <li key={i} className="list-disc break-words">{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {m.deliverables.length > 0 && (
                            <div className="mb-3">
                              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Deliverables
                              </div>
                              <ul className="space-y-1 pl-4 text-sm text-muted-foreground">
                                {m.deliverables.map((d, i) => (
                                  <li key={i} className="list-disc break-words">{d}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {m.acceptanceCriteria && (
                            <div className="rounded-md bg-secondary/50 p-2.5 text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground/80">Acceptance: </span>
                              <span className="break-words">{m.acceptanceCriteria}</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No milestone details provided.
                </p>
              )}
            </TabsContent>

            {/* ── Risk ─────────────────────────────────────────────── */}
            <TabsContent value="risk">
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { title: "Implementation Risks",  icon: "⚠️",  content: grant.risks.implementation },
                  { title: "Potential Side Effects", icon: "↔️",  content: grant.risks.sideEffects    },
                  { title: "Success Metrics",        icon: "✅",  content: grant.risks.successMetrics },
                ].map((r) => (
                  <Card key={r.title} className="border-border/50 bg-card">
                    <CardHeader className="pb-2 pt-4">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-400" />
                        {r.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <p className="break-words text-sm leading-relaxed text-muted-foreground whitespace-pre-line">
                        {r.content || "Not provided"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* ── Discussion ───────────────────────────────────────── */}
            <TabsContent value="discussion">
              <div className="space-y-3">
                {grant.comments.map((c) => (
                  <Card key={c.id} className="border-border/50 bg-card">
                    <CardContent className="p-4">
                      <div className="mb-2.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <img
                          src={c.avatar}
                          alt={c.author}
                          className="h-6 w-6 shrink-0 rounded-full"
                        />
                        <a
                          href={`https://github.com/${c.author}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-foreground hover:text-primary hover:underline"
                        >
                          @{c.author}
                        </a>
                        <span className="text-xs text-muted-foreground">
                          {new Date(c.timestamp).toLocaleDateString(undefined, {
                            year: "numeric", month: "short", day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="break-words whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                        {c.body}
                      </p>
                    </CardContent>
                  </Card>
                ))}

                {grant.comments.length === 0 && (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    No comments yet.
                  </p>
                )}

                {/* CTA */}
                <Card className="border-border/50 bg-card">
                  <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                      Comments live on GitHub. Click to join the discussion.
                    </p>
                    <Button size="sm" variant="outline" className="shrink-0 gap-2" asChild>
                      <a href={grant.githubLink} target="_blank" rel="noopener noreferrer">
                        <Github className="h-4 w-4" />
                        Comment on GitHub
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ── Documents ────────────────────────────────────────── */}
            <TabsContent value="documents">
              {grant.documents.length > 0 ? (
                <div className="space-y-2">
                  {grant.documents.map((d, i) => (
                    <Card key={i} className="border-border/50 bg-card">
                      <CardContent className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{d.name}</div>
                          {d.description && (
                            <div className="truncate text-xs text-muted-foreground">{d.description}</div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" className="shrink-0 gap-1" asChild>
                          <a href={d.url} target="_blank" rel="noopener noreferrer">
                            <FileText className="h-3.5 w-3.5" /> Open
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No documents attached.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Right sidebar (desktop) ───────────────────────────────────── */}
        <aside className="w-full shrink-0 space-y-3 lg:w-64 xl:w-72">
          {/* Status */}
          <Card className="border-border/50 bg-card">
            <CardContent className="p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Grant Status
              </h3>
              <StatusBadge status={grant.status} />
            </CardContent>
          </Card>

          {/* Committee */}
          <Card className="border-border/50 bg-card">
            <CardContent className="p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Committee
              </h3>
              {grant.committeeMembers.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {grant.committeeMembers.map((m) => (
                    <a
                      key={m}
                      href={`https://github.com/${m}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      @{m}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Not yet assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Milestone summary */}
          {grant.totalMilestones > 0 && (
            <Card className="border-border/50 bg-card">
              <CardContent className="p-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Milestones
                </h3>
                <div className="mb-2">
                  <MilestoneProgressBar milestones={grant.milestones} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {grant.milestonesCompleted} / {grant.totalMilestones} paid
                  {" · "}
                  <span className="text-primary">${grant.amountPaid.toLocaleString()}</span>
                </p>
              </CardContent>
            </Card>
          )}

          {/* DAODAO integration card (UI first, data wiring next) */}
          <Card className="border-border/50 bg-card">
            <CardContent className="p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                DAODAO Vote
              </h3>
              <div
                className={`mb-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs ${daoStatusMeta[daoDemoStatus].className}`}
              >
                {daoStatusMeta[daoDemoStatus].label}
              </div>
              <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
                Live governance snapshot with direct actions.
              </p>

              {/* Demo status switcher */}
              <div className="mb-3 flex flex-wrap gap-1.5">
                {(["DRAFT", "IN_VOTING", "PASSED", "REJECTED"] as const).map(
                  (s) => (
                    <button
                      key={s}
                      onClick={() => setDaoDemoStatus(s)}
                      className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                        daoDemoStatus === s
                          ? "bg-primary/20 text-primary"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {daoStatusMeta[s].label}
                    </button>
                  )
                )}
              </div>

              {daoDemoStatus === "IN_VOTING" && (
                <div className="mb-3 space-y-2 rounded-md bg-secondary/40 p-2.5">
                  {[
                    ["Yes", demoVotes.yes, "bg-emerald-400"],
                    ["No", demoVotes.no, "bg-red-400"],
                    ["Abstain", demoVotes.abstain, "bg-slate-400"],
                  ].map(([label, value, color]) => (
                    <div key={label as string}>
                      <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{label as string}</span>
                        <span>{value as number}%</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full ${color as string}`}
                          style={{ width: `${value as number}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" asChild>
                  <a href={daodaoUrl} target="_blank" rel="noopener noreferrer">
                    <Scale className="h-4 w-4" />
                    View on DAODAO
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start gap-2" disabled>
                  <ExternalLink className="h-4 w-4" />
                  Link Proposal (Coming Soon)
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Actions — only shown on desktop (mobile uses quick-actions bar above) */}
          <div className="hidden space-y-2 lg:block">
            <Button variant="outline" className="w-full justify-start gap-2 text-sm" asChild>
              <a href={grant.forumLink} target="_blank" rel="noopener noreferrer">
                <MessageSquare className="h-4 w-4 shrink-0" /> Forum Thread
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 text-sm" asChild>
              <a href={grant.githubLink} target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4 shrink-0" /> GitHub Issue
              </a>
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2 text-sm" asChild>
              <a
                href="https://forum.zcashcommunity.com/c/grants/33"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 shrink-0" /> Contact ZCG
              </a>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
