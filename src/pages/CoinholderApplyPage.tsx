import Link from "next/link";
import { useState, type ReactNode } from "react";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Save,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getGitHubToken } from "@/lib/githubAuth";
import {
  COINHOLDER_CATEGORIES,
  COINHOLDER_TERMS_COUNT,
  DEFAULT_COINHOLDER_BUDGET_BREAKDOWN,
  DEFAULT_COINHOLDER_TEAM_MEMBERS,
  DEFAULT_PROOF_OF_COMPLETION,
  type CoinholderFormData,
} from "@/lib/coinholderApplyIssue";
import { getIssueRepoSlug } from "@/lib/grantPrograms";

const stepLabels = [
  "Terms & Conditions",
  "Applicant & organization",
  "Project overview",
  "Budget & funding",
  "Impact & evidence",
  "Review & submit",
];

const coinholderTerms: ReactNode[] = [
  <>
    I agree to the{" "}
    <a
      href="https://9ba4718c-5c73-47c3-a024-4fc4e5278803.usrfiles.com/ugd/9ba471_6ff6db4095fd4c4ba21babec361e927e.pdf"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      Grant Agreement
    </a>{" "}
    terms if funded
  </>,
  <>
    I agree to{" "}
    <a
      href="https://9ba4718c-5c73-47c3-a024-4fc4e5278803.usrfiles.com/ugd/9ba471_7d9e73d16b584a61bae92282b208efc4.pdf"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      Provide KYC information
    </a>{" "}
    if funded above $50,000 USD
  </>,
  <>I agree to disclose conflicts of interest</>,
  <>
    I understand that this grant program is only eligible for{" "}
    <span className="font-medium text-foreground">completed work</span>, as it
    is a retroactive grant program. Applications for planned or partially completed
    work will not be considered.
  </>,
  <>
    I agree that for any new open-source software, I will create a{" "}
    <code className="text-xs">CONTRIBUTING.md</code> file aligned with the{" "}
    <a
      href="https://github.com/zcash/librustzcash/blob/main/CONTRIBUTING.md#styleguides"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      librustzcash style guides
    </a>
    .
  </>,
  <>
    I understand when contributing to existing Zcash code, I will follow project
    contribution guidelines (merge, branch, PR, commit) as in librustzcash.
  </>,
  <>
    I understand grants are valued in USD but disbursed in Shielded ZEC, and
    amounts may fluctuate with the exchange rate at payment time.
  </>,
  <>
    I understand it is my responsibility to post a link to this issue on the{" "}
    <a
      href="https://forum.zcashcommunity.com/t/about-the-retroactive-grants-category/52106"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      Zcash Community Forums (Retroactive Grants)
    </a>{" "}
    after submission so the community can discuss and vote. If I cannot post
    (e.g. new user limits), I will comment on the issue for help with permissions.
  </>,
];

const LAST_STEP = stepLabels.length - 1;

export function CoinholderApplyWizard({ embedded = false }: { embedded?: boolean }) {
  const [step, setStep] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState<boolean[]>(() =>
    new Array(COINHOLDER_TERMS_COUNT).fill(false)
  );
  const [formData, setFormData] = useState<CoinholderFormData>({
    github: "",
    organizationOrIndividualName: "",
    additionalTeamMembers: DEFAULT_COINHOLDER_TEAM_MEMBERS,
    discovery: "",
    applicationTitle: "",
    requestedAmountUsd: "",
    category: "",
    projectSummary: "",
    projectDescription: "",
    technicalApproach: "",
    timePeriod: "",
    totalBudgetUsd: "",
    budgetBreakdown: DEFAULT_COINHOLDER_BUDGET_BREAKDOWN,
    prevFunding: "no",
    prevFundingDetails: "",
    otherFunding: "no",
    otherFundingDetails: "",
    successMetrics: "",
    proofOfCompletion: DEFAULT_PROOF_OF_COMPLETION,
    conflictOfInterest: "",
  });
  const [confirmed, setConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allTermsAccepted = termsAccepted.every(Boolean);
  const targetRepo = getIssueRepoSlug("coinholder");

  const updateField = <K extends keyof CoinholderFormData>(
    key: K,
    val: CoinholderFormData[K]
  ) => setFormData((prev) => ({ ...prev, [key]: val }));

  const handleSubmitToGitHub = async () => {
    setSubmitError(null);
    const token = getGitHubToken();
    if (!token) {
      setSubmitError("Not authenticated. Connect GitHub first.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/create-issue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          program: "coinholder",
          formData,
          termsAccepted,
        }),
      });
      const result = (await response.json()) as {
        issueUrl?: string;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(result.error || "Failed to create issue.");
      }
      if (!result.issueUrl) {
        throw new Error("Issue created but URL missing in response.");
      }
      window.open(result.issueUrl, "_blank");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to create issue."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const Heading = embedded ? "h2" : "h1";

  return (
    <div className={embedded ? "" : "container mx-auto px-4 py-6 sm:py-8"}>
      {!embedded && (
        <p className="mb-2 text-xs text-muted-foreground">
          <Link href="/apply" className="text-primary hover:underline">
            ZCG (forward-looking) grant application
          </Link>
          {" · "}
          <Link href="/grants?program=coinholder" className="text-primary hover:underline">
            Browse Coinholder grants
          </Link>
        </p>
      )}
      <Heading
        className={`mb-1 font-bold text-foreground ${embedded ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"}`}
      >
        Lockbox — Coinholder retroactive grant application
      </Heading>
      {/* <p className="mb-2 text-sm text-muted-foreground sm:mb-4 sm:text-base">
        For <span className="font-medium text-foreground">completed work only</span>
        . Submitted issues are created in{" "}
        <code className="rounded bg-secondary px-1 text-xs">{targetRepo}</code> with
        label <code className="rounded bg-secondary px-1 text-xs">Pending Retroactive Grant Application</code>
        .
        {embedded && (
          <>
            {" "}
            <Link href="/grants?program=coinholder" className="text-primary hover:underline">
              Browse Coinholder grants
            </Link>
            .
          </>
        )}
      </p> */}

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <nav className="w-full shrink-0 lg:w-56 xl:w-64">
          <div className="space-y-0.5 lg:sticky lg:top-24">
            {stepLabels.map((label, i) => (
              <button
                key={i}
                type="button"
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
                <div
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    i < step
                      ? "bg-primary text-primary-foreground"
                      : i === step
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                  )}
                >
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </div>
                {label}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex-1">
          {step === 0 && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4 sm:space-y-4 sm:px-6 sm:pb-6">
                {coinholderTerms.map((term, i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-start gap-3"
                  >
                    <Checkbox
                      checked={termsAccepted[i]}
                      onCheckedChange={() =>
                        setTermsAccepted((prev) => {
                          const n = [...prev];
                          n[i] = !n[i];
                          return n;
                        })
                      }
                      className="mt-0.5"
                    />
                    <span className="text-sm text-muted-foreground">{term}</span>
                  </label>
                ))}
                <p className="text-xs text-muted-foreground">
                  All items must be accepted to continue (including the forum posting
                  commitment).
                </p>
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                <CardTitle>Applicant & organization</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Application owners (@octocat, @octocat1) *
                  </label>
                  <Input
                    value={formData.github}
                    onChange={(e) => updateField("github", e.target.value)}
                    placeholder="@owner1, @owner2"
                    className="bg-secondary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Organization or individual name *
                  </label>
                  <Input
                    value={formData.organizationOrIndividualName}
                    onChange={(e) =>
                      updateField("organizationOrIndividualName", e.target.value)
                    }
                    className="bg-secondary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Additional team members *
                  </label>
                  <p className="mb-2 text-xs text-muted-foreground">
                    YAML-style list. Use “None” or “N/A” if you are the only person.
                  </p>
                  <Textarea
                    value={formData.additionalTeamMembers}
                    onChange={(e) =>
                      updateField("additionalTeamMembers", e.target.value)
                    }
                    className="min-h-[160px] bg-secondary font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    How did you learn about the Lockbox: Coinholder Retroactive Grants
                    Program? *
                  </label>
                  <Textarea
                    value={formData.discovery}
                    onChange={(e) => updateField("discovery", e.target.value)}
                    className="bg-secondary"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                <CardTitle>Project overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Application name (used in issue title) *
                  </label>
                  <Input
                    value={formData.applicationTitle}
                    onChange={(e) =>
                      updateField("applicationTitle", e.target.value)
                    }
                    placeholder="Short name for your retroactive application"
                    className="bg-secondary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Requested grant amount (USD) *
                  </label>
                  <Input
                    value={formData.requestedAmountUsd}
                    onChange={(e) =>
                      updateField("requestedAmountUsd", e.target.value)
                    }
                    placeholder="e.g. $50,000"
                    className="bg-secondary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Category *
                  </label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => updateField("category", v)}
                  >
                    <SelectTrigger className="bg-secondary">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {COINHOLDER_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Project summary *
                  </label>
                  <Textarea
                    value={formData.projectSummary}
                    onChange={(e) => updateField("projectSummary", e.target.value)}
                    className="bg-secondary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Project description *
                  </label>
                  <Textarea
                    value={formData.projectDescription}
                    onChange={(e) =>
                      updateField("projectDescription", e.target.value)
                    }
                    className="min-h-[120px] bg-secondary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Technical approach (how you did it) *
                  </label>
                  <Textarea
                    value={formData.technicalApproach}
                    onChange={(e) =>
                      updateField("technicalApproach", e.target.value)
                    }
                    className="min-h-[120px] bg-secondary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Time period of work completion *
                  </label>
                  <Input
                    value={formData.timePeriod}
                    onChange={(e) => updateField("timePeriod", e.target.value)}
                    placeholder="e.g. Q3 2024 or July 2024 – September 2024"
                    className="bg-secondary"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                <CardTitle>Budget & funding</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Total budget (USD) *
                  </label>
                  <Input
                    value={formData.totalBudgetUsd}
                    onChange={(e) => updateField("totalBudgetUsd", e.target.value)}
                    placeholder="e.g. $50,000"
                    className="bg-secondary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Budget breakdown *
                  </label>
                  <Textarea
                    value={formData.budgetBreakdown}
                    onChange={(e) => updateField("budgetBreakdown", e.target.value)}
                    className="min-h-[200px] bg-secondary font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Previous funding (Coinholder program)
                  </label>
                  <Select
                    value={formData.prevFunding}
                    onValueChange={(v) =>
                      updateField("prevFunding", v as "yes" | "no")
                    }
                  >
                    <SelectTrigger className="bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Previous funding details
                  </label>
                  <Textarea
                    value={formData.prevFundingDetails}
                    onChange={(e) =>
                      updateField("prevFundingDetails", e.target.value)
                    }
                    className="bg-secondary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Other funding sources
                  </label>
                  <Select
                    value={formData.otherFunding}
                    onValueChange={(v) =>
                      updateField("otherFunding", v as "yes" | "no")
                    }
                  >
                    <SelectTrigger className="bg-secondary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no">No</SelectItem>
                      <SelectItem value="yes">Yes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Other funding sources details
                  </label>
                  <Textarea
                    value={formData.otherFundingDetails}
                    onChange={(e) =>
                      updateField("otherFundingDetails", e.target.value)
                    }
                    className="bg-secondary"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                <CardTitle>Impact & evidence</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:px-6 sm:pb-6">
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Success metrics *
                  </label>
                  <Textarea
                    value={formData.successMetrics}
                    onChange={(e) => updateField("successMetrics", e.target.value)}
                    className="min-h-[100px] bg-secondary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Proof of completion *
                  </label>
                  <Textarea
                    value={formData.proofOfCompletion}
                    onChange={(e) =>
                      updateField("proofOfCompletion", e.target.value)
                    }
                    className="min-h-[160px] bg-secondary font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    Conflict of interest disclosure (optional)
                  </label>
                  <Textarea
                    value={formData.conflictOfInterest}
                    onChange={(e) =>
                      updateField("conflictOfInterest", e.target.value)
                    }
                    className="bg-secondary"
                    placeholder="Disclose any actual, potential, or perceived conflicts."
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {step === LAST_STEP && (
            <Card className="border-border/50 bg-card">
              <CardHeader className="px-4 pb-2 pt-4 sm:px-6 sm:pt-6">
                <CardTitle>Review & submit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 px-4 pb-4 sm:space-y-6 sm:px-6 sm:pb-6">
                <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Application name
                    </span>
                    <p className="font-medium text-foreground">
                      {formData.applicationTitle || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">
                      Requested amount
                    </span>
                    <p className="font-medium text-primary">
                      {formData.requestedAmountUsd || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Category</span>
                    <p className="font-medium text-foreground">
                      {formData.category || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Org / name</span>
                    <p className="font-medium text-foreground">
                      {formData.organizationOrIndividualName || "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Summary</span>
                  <p className="text-sm text-muted-foreground">
                    {formData.projectSummary || "—"}
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-3">
                  <Checkbox
                    checked={confirmed}
                    onCheckedChange={() => setConfirmed(!confirmed)}
                  />
                  <span className="text-sm text-foreground">
                    I confirm all information is accurate and this application is for
                    completed work only.
                  </span>
                </label>
                <Button
                  size="lg"
                  disabled={!confirmed || !allTermsAccepted || isSubmitting}
                  className="w-full gap-2 bg-primary font-semibold text-primary-foreground"
                  onClick={() => void handleSubmitToGitHub()}
                >
                  <FileText className="h-4 w-4" />
                  {isSubmitting ? "Submitting…" : "Submit retroactive application"}
                </Button>
                {submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}
              </CardContent>
            </Card>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4 sm:mt-6 sm:pt-6">
            <Button variant="outline" size="sm" className="gap-1 text-muted-foreground">
              <Save className="h-3.5 w-3.5" /> Save draft
            </Button>
            <div className="flex gap-2 sm:gap-3">
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
              )}
              {step < LAST_STEP && (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 0 && !allTermsAccepted}
                  className="gap-1 bg-primary text-primary-foreground"
                >
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

export default function CoinholderApplyPage() {
  return <CoinholderApplyWizard />;
}
