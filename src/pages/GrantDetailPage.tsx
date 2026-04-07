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
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import { WorkflowStepper } from "@/components/WorkflowStepper";
import { MilestoneProgressBar } from "@/components/MilestoneProgressBar";
import { useGrant } from "@/hooks/useGrants";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

function DetailSkeleton() {
  return (
    <div className="container mx-auto animate-pulse px-4 py-8">
      <div className="mb-6 h-4 w-24 rounded bg-secondary" />
      <div className="mb-3 flex gap-2">
        <div className="h-5 w-24 rounded-full bg-secondary" />
        <div className="h-5 w-20 rounded-full bg-secondary" />
      </div>
      <div className="mb-2 h-8 w-2/3 rounded bg-secondary" />
      <div className="h-4 w-1/3 rounded bg-secondary" />
      <div className="mt-6 h-16 w-full rounded-lg bg-secondary" />
      <div className="mt-6 h-64 w-full rounded-lg bg-secondary" />
    </div>
  );
}

export default function GrantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: grant, isLoading, isError, error } = useGrant(id);
  const [expandedSections, setExpandedSections] = useState<string[]>(["summary"]);

  const toggleSection = (s: string) =>
    setExpandedSections((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const CollapsibleSection = ({
    id: sectionId,
    title,
    content,
  }: {
    id: string;
    title: string;
    content: string;
  }) => (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => toggleSection(sectionId)}
        className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-foreground hover:text-primary"
      >
        {title}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            expandedSections.includes(sectionId) ? "rotate-180" : ""
          }`}
        />
      </button>
      {expandedSections.includes(sectionId) && (
        <p className="whitespace-pre-line break-all pb-4 text-sm leading-relaxed text-muted-foreground">
          {content || <span className="italic">Not provided</span>}
        </p>
      )}
    </div>
  );

  if (isLoading) return <DetailSkeleton />;

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-400" />
        <h1 className="text-2xl font-bold text-foreground">
          Could not load grant
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {(error as Error)?.message || "Failed to fetch from GitHub API."}
        </p>
        <Link to="/grants">
          <Button variant="outline" className="mt-6">
            Back to Grants
          </Button>
        </Link>
      </div>
    );
  }

  if (!grant) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-foreground">Grant not found</h1>
        <Link to="/grants">
          <Button variant="outline" className="mt-4">
            Back to Grants
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to="/grants"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Grants
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <div className="mb-3 flex flex-wrap gap-2">
            <StatusBadge status={grant.status} />
            <CategoryBadge category={grant.category} />
          </div>
          <h1 className="text-2xl font-bold text-foreground lg:text-3xl">
            {grant.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <img
                src={grant.applicantAvatar}
                alt={grant.applicant}
                className="h-6 w-6 rounded-full"
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
              <Calendar className="h-3.5 w-3.5" />
              {new Date(grant.submittedDate).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Updated {new Date(grant.lastUpdated).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Requested</div>
            <div className="text-2xl font-bold text-primary">
              {grant.amount > 0
                ? `$${grant.amount.toLocaleString()}`
                : "TBD"}
            </div>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              navigator.clipboard.writeText(window.location.href)
            }
          >
            <Share2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Workflow */}
      <Card className="mb-6 border-border/50 bg-card">
        <CardContent className="overflow-x-auto p-4">
          <WorkflowStepper status={grant.status} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Main content */}
        <div className="flex-1">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4 flex w-full flex-wrap bg-secondary">
              {[
                "Overview",
                "Team",
                "Budget",
                "Milestones",
                "Risk",
                "Discussion",
                "Documents",
              ].map((t) => (
                <TabsTrigger
                  key={t}
                  value={t.toLowerCase()}
                  className="flex-1 text-xs sm:text-sm"
                >
                  {t}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview">
              <Card className="border-border/50 bg-card">
                <CardContent className="p-5">
                  {grant.summary && (
                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                      {grant.summary}
                    </p>
                  )}
                  <CollapsibleSection
                    id="description"
                    title="Project Description"
                    content={grant.description}
                  />
                  <CollapsibleSection
                    id="problem"
                    title="Proposed Problem"
                    content={grant.problem}
                  />
                  <CollapsibleSection
                    id="solution"
                    title="Proposed Solution"
                    content={grant.solution}
                  />
                  <CollapsibleSection
                    id="format"
                    title="Solution Format"
                    content={grant.solutionFormat}
                  />
                  <CollapsibleSection
                    id="deps"
                    title="Dependencies"
                    content={grant.dependencies}
                  />
                  <CollapsibleSection
                    id="tech"
                    title="Technical Approach"
                    content={grant.technicalApproach}
                  />
                  <CollapsibleSection
                    id="upstream"
                    title="Upstream Merge Opportunities"
                    content={grant.upstreamMerge}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="team">
              <Card className="mb-4 border-border/50 bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Project Lead</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
                      {grant.teamLead.name[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">
                        {grant.teamLead.name}
                      </div>
                      <div className="text-sm text-primary">
                        {grant.teamLead.role}
                      </div>
                      {grant.teamLead.background && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {grant.teamLead.background}
                        </p>
                      )}
                      {grant.teamLead.responsibilities && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          <strong>Responsibilities:</strong>{" "}
                          {grant.teamLead.responsibilities}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
              {grant.teamMembers.length > 0 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  {grant.teamMembers.map((m, i) => (
                    <Card key={i} className="border-border/50 bg-card">
                      <CardContent className="p-5">
                        <div className="mb-2 flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-bold text-foreground">
                            {m.name[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {m.name}
                            </div>
                            <div className="text-xs text-primary">{m.role}</div>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {m.responsibilities}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {grant.teamMembers.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No additional team members listed.
                </p>
              )}
            </TabsContent>

            <TabsContent value="budget">
              <Card className="border-border/50 bg-card">
                <CardContent className="p-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground">
                        <th className="pb-2 text-left font-medium">Category</th>
                        <th className="pb-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(
                        [
                          ["Hardware/Software", grant.budget.hardware],
                          ["Services", grant.budget.services],
                          ["Compensation", grant.budget.compensation],
                        ] as [string, number][]
                      ).map(([cat, amt]) => (
                        <tr key={cat} className="border-b border-border/50">
                          <td className="py-3 text-foreground">{cat}</td>
                          <td className="py-3 text-right text-foreground">
                            ${amt.toLocaleString()}
                          </td>
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="milestones">
              {grant.milestones.length > 0 ? (
                <>
                  <Card className="mb-4 border-border/50 bg-card">
                    <CardContent className="p-5">
                      <div className="mb-2 flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {grant.milestonesCompleted} of {grant.totalMilestones}{" "}
                          milestones paid
                        </span>
                        <span className="font-medium text-primary">
                          ${grant.amountPaid.toLocaleString()} of $
                          {grant.amount.toLocaleString()}
                        </span>
                      </div>
                      <MilestoneProgressBar milestones={grant.milestones} />
                    </CardContent>
                  </Card>
                  <div className="space-y-4">
                    {grant.milestones.map((m) => (
                      <Card key={m.number} className="border-border/50 bg-card">
                        <CardContent className="p-5">
                          <div className="mb-2 flex items-center justify-between">
                            <h3 className="font-semibold text-foreground">
                              Milestone {m.number}
                            </h3>
                            <StatusBadge
                              status={
                                m.status === "Paid"
                                  ? "COMPLETED"
                                  : m.status === "In Progress"
                                  ? "ACTIVE"
                                  : "PENDING_REVIEW"
                              }
                            />
                          </div>
                          <div className="mb-3 flex gap-4 text-sm text-muted-foreground">
                            <span>${m.amount.toLocaleString()}</span>
                            {m.dueDate && (
                              <span>
                                Due:{" "}
                                {new Date(m.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {m.userStories.length > 0 && (
                            <div className="mb-2">
                              <div className="mb-1 text-xs font-medium text-muted-foreground">
                                User Stories
                              </div>
                              <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                                {m.userStories.map((s, i) => (
                                  <li key={i}>{s}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {m.deliverables.length > 0 && (
                            <div className="mb-2">
                              <div className="mb-1 text-xs font-medium text-muted-foreground">
                                Deliverables
                              </div>
                              <ul className="list-disc space-y-0.5 pl-4 text-sm text-muted-foreground">
                                {m.deliverables.map((d, i) => (
                                  <li key={i}>{d}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {m.acceptanceCriteria && (
                            <div className="text-xs text-muted-foreground">
                              <strong>Acceptance:</strong>{" "}
                              {m.acceptanceCriteria}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No milestone details provided.
                </p>
              )}
            </TabsContent>

            <TabsContent value="risk">
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  {
                    title: "Implementation Risks",
                    content: grant.risks.implementation,
                  },
                  {
                    title: "Potential Side Effects",
                    content: grant.risks.sideEffects,
                  },
                  {
                    title: "Success Metrics",
                    content: grant.risks.successMetrics,
                  },
                ].map((r) => (
                  <Card key={r.title} className="border-border/50 bg-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-yellow-400" />
                        {r.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-line break-all text-sm text-muted-foreground">
                        {r.content || "Not provided"}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="discussion">
              <div className="space-y-4">
                {grant.comments.map((c) => (
                  <Card key={c.id} className="border-border/50 bg-card">
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <img
                          src={c.avatar}
                          alt={c.author}
                          className="h-6 w-6 rounded-full"
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
                          {new Date(c.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="whitespace-pre-line break-all text-sm text-muted-foreground">
                        {c.body}
                      </p>
                    </CardContent>
                  </Card>
                ))}
                {grant.comments.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No comments yet.
                  </p>
                )}
                <Card className="border-border/50 bg-card">
                  <CardContent className="p-4">
                    <p className="mb-3 text-xs text-muted-foreground">
                      Discussion happens on GitHub. Click below to comment.
                    </p>
                    <Button size="sm" variant="outline" asChild>
                      <a
                        href={grant.githubLink}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Github className="mr-2 h-4 w-4" />
                        Comment on GitHub
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="documents">
              {grant.documents.length > 0 ? (
                <div className="space-y-2">
                  {grant.documents.map((d, i) => (
                    <Card key={i} className="border-border/50 bg-card">
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <div className="text-sm font-medium text-foreground">
                            {d.name}
                          </div>
                          {d.description && (
                            <div className="text-xs text-muted-foreground">
                              {d.description}
                            </div>
                          )}
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <FileText className="mr-1 h-3 w-3" /> Open
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No documents attached.
                </p>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar */}
        <aside className="w-full shrink-0 space-y-4 lg:w-72">
          <Card className="border-border/50 bg-card">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Grant Status
              </h3>
              <StatusBadge status={grant.status} />
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground">
                Committee
              </h3>
              {grant.committeeMembers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {grant.committeeMembers.map((m) => (
                    <a
                      key={m}
                      href={`https://github.com/${m}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground hover:text-primary"
                    >
                      @{m}
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Not yet assigned
                </p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              asChild
            >
              <a
                href={grant.forumLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageSquare className="h-4 w-4" /> Forum Thread
              </a>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              asChild
            >
              <a
                href={grant.githubLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Github className="h-4 w-4" /> GitHub Issue
              </a>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              asChild
            >
              <a
                href="https://forum.zcashcommunity.com/c/grants/33"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4" /> Contact ZCG
              </a>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
