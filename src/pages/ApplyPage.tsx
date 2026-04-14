import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileEdit,
  FileText,
  Plus,
  Save,
  Scale,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { getGitHubToken } from "@/lib/githubAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoinholderApplyWizard } from "@/pages/CoinholderApplyPage";
import {
  zechubDaoCreateProposalUrl,
  zechubDaoDaodaoUrl,
} from "@/lib/daodao/zechubConfig";
import {
  clearZcgApplyDraft,
  loadZcgApplyDraft,
  saveZcgApplyDraft,
} from "@/lib/zcgApplyDraft";

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
  <>
    I agree to the{" "}
    <a
      href="https://9ba4718c-5c73-47c3-a024-4fc4e5278803.usrfiles.com/ugd/9ba471_f81ef4e4b5f040038350270590eb2e42.pdf"
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
    I agree to adhere to the{" "}
    <a
      href="https://forum.zcashcommunity.com/t/zcg-code-of-conduct/41787"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      Code of Conduct
    </a>{" "}
    and{" "}
    <a
      href="https://forum.zcashcommunity.com/t/zcg-communication-guidelines/44284"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      Communication Guidelines
    </a>
  </>,
  <>
    I understand all milestone deliverables will be validated and accepted by their intended users or their representatives, who will confirm that the deliverables meet the required quality, functionality, and usability for each user story.
  </>,
  <>
    I agree that for any new open-source software, I will create a <code>CONTRIBUTING.md</code> file that reflects the high standards of Zcash development, using the{" "}
    <a
      href="https://github.com/zcash/librustzcash/blob/main/CONTRIBUTING.md#styleguides"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      librustzcash style guides
    </a>{" "}
    as a primary reference.
  </>,
  <>
    I understand when contributing to existing Zcash code, I am required to adhere to the project specific contribution guidelines, paying close attention to any{" "}
    <a
      href="https://github.com/zcash/librustzcash/blob/main/CONTRIBUTING.md#merge-workflow"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      merge
    </a>
    ,{" "}
    <a
      href="https://github.com/zcash/librustzcash/blob/main/CONTRIBUTING.md#branch-history"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      branch
    </a>
    ,{" "}
    <a
      href="https://github.com/zcash/librustzcash/blob/main/CONTRIBUTING.md#pull-request-review"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      pull request
    </a>
    , and{" "}
    <a
      href="https://github.com/zcash/librustzcash/blob/main/CONTRIBUTING.md#commit-messages"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      commit
    </a>{" "}
    guidelines as exemplified in the <code>librustzcash</code> repository.
  </>,
  <>
    I agree to post request details on the{" "}
    <a
      href="https://forum.zcashcommunity.com/c/grants/33"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      Community Forum
    </a>
  </>,
  <>
    I understand it is my responsibility to post a link to this issue on the{" "}
    <a
      href="https://forum.zcashcommunity.com/c/grants/33"
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:text-foreground"
    >
      Zcash Community Forums
    </a>{" "}
    after this application has been submitted so the community can give input. I understand this is required in order for ZCG to discuss and vote on this grant application.
  </>,
];

const categories = [
  "Infrastructure", "Community", "Education", "Non-Wallet Applications", "Integration",
  "Wallets", "Research & Development", "Media", "Zcash Protocol Extension", "Dedicated Resource", "Event Sponsorships",
];

const OFFICIAL_ZCG_REPO = "ZcashCommunityGrants/zcashcommunitygrants";

function toYesNo(value: string): "Yes" | "No" {
  return value === "yes" ? "Yes" : "No";
}

function normalizeAssignees(value: string): string {
  return value
    .split(",")
    .map((v) => v.trim().replace(/^@+/, ""))
    .filter(Boolean)
    .join(",");
}

function buildTeamLeadText(leadName: string, leadRole: string, leadBg: string, leadResp: string): string {
  return [
    `Name: ${leadName || ""}`,
    `Role: ${leadRole || ""}`,
    `Background: ${leadBg || ""}`,
    `Responsibilities: ${leadResp || ""}`,
  ].join("\n");
}

function buildTeamMembersText(
  teamMembers: { name: string; role: string; bg: string; resp: string }[]
): string {
  if (teamMembers.length === 0) return "None or N/A";
  return teamMembers
    .map((m) =>
      [
        `- Name: ${m.name || ""}`,
        `Role: ${m.role || ""}`,
        `Background: ${m.bg || ""}`,
        `Responsibilities: ${m.resp || ""}`,
      ].join("\n")
    )
    .join("\n");
}

function buildMilestonesText(
  milestones: { amount: string; date: string; stories: string[]; deliverables: string[]; criteria: string }[]
): string {
  if (milestones.length === 0) return "";
  return milestones
    .map((m, i) => {
      const stories = (m.stories || []).filter(Boolean);
      const deliverables = (m.deliverables || []).filter(Boolean);
      return [
        `- Milestone: ${i + 1}`,
        `  Amount (USD): ${m.amount || "0"}`,
        `  Expected Completion Date: ${m.date || "YYYY-MM-DD"}`,
        "  User Stories:",
        ...(stories.length > 0
          ? stories.map((s) => `    - "${s}"`)
          : [
              '    - "As a [type of user], I want [some goal], so that [some reason]"',
              '    - "As a [different type of user], I want [some goal], so that [some reason]" (optional - add more as needed)',
            ]),
        "  Deliverables:",
        ...(deliverables.length > 0
          ? deliverables.map((d) => `    - ${d}`)
          : [
              "    - [List specific deliverables that fulfill the user stories]",
              "    - [Each deliverable should clearly address one or more user stories]",
            ]),
        `  Acceptance Criteria: ${m.criteria || "[How will the target users validate this milestone is complete?]"}`,
      ].join("\n");
    })
    .join("\n\n");
}

function buildDocumentsText(
  documents: { name: string; url: string; desc: string }[]
): string {
  if (documents.length === 0) return "";
  return documents
    .map((d, i) => {
      const label = d.name || `File Name ${i + 1}`;
      const desc = d.desc || "Supporting file";
      const link = d.url ? ` (${d.url})` : "";
      return `- ${label}: ${desc}${link}`;
    })
    .join("\n");
}

function buildIssueDraftUrl(args: {
  github: string;
  formData: {
    org: string;
    howLearn: string;
    title: string;
    amount: string;
    category: string;
    leadName: string;
    leadRole: string;
    leadBg: string;
    leadResp: string;
    summary: string;
    description: string;
    problem: string;
    solution: string;
    solutionFormat: string;
    dependencies: string;
    techApproach: string;
    upstream: string;
    hardware: string;
    services: string;
    compensation: string;
    prevFunding: string;
    otherFunding: string;
    implRisks: string;
    sideEffects: string;
    successMetrics: string;
    startupAmount: string;
    startupJustification: string;
    hardwareJustification: string;
    serviceJustification: string;
    compensationJustification: string;
    prevFundingDetails: string;
    otherFundingDetails: string;
  };
  teamMembers: { name: string; role: string; bg: string; resp: string }[];
  milestones: { amount: string; date: string; stories: string[]; deliverables: string[]; criteria: string }[];
  documents: { name: string; url: string; desc: string }[];
}): string | null {
  const repo =
    process.env.NEXT_PUBLIC_ZCG_GITHUB_REPO ||
    OFFICIAL_ZCG_REPO;
  const [owner, name] = repo.split("/");
  if (!owner || !name) return null;

  const cleanAssignee = normalizeAssignees(args.github || "");
  const total =
    Number(args.formData.hardware) +
    Number(args.formData.services) +
    Number(args.formData.compensation);
  const title = `Grant Application - ${args.formData.title || "Application Name"}`;
  const params = new URLSearchParams({
    template: "grant_application.yaml",
    title,
    assignees: cleanAssignee,
    organization_details_name: args.formData.org,
    organization_details_discovery: args.formData.howLearn,
    project_overview_amount: args.formData.amount || "",
    project_overview_category: args.formData.category,
    team_information_project_lead: buildTeamLeadText(
      args.formData.leadName,
      args.formData.leadRole,
      args.formData.leadBg,
      args.formData.leadResp
    ),
    team_information_members: buildTeamMembersText(args.teamMembers),
    project_details_summary: args.formData.summary,
    project_details_description: args.formData.description,
    project_details_problem: args.formData.problem,
    project_details_solution: args.formData.solution,
    project_details_format: args.formData.solutionFormat,
    project_details_dependencies: args.formData.dependencies,
    project_details_technical: args.formData.techApproach,
    project_details_merge: args.formData.upstream,
    budget_hardware: args.formData.hardware,
    budget_hardware_justification: args.formData.hardwareJustification,
    budget_service: args.formData.services,
    budget_service_justification: args.formData.serviceJustification,
    budget_compensation: args.formData.compensation,
    budget_compensation_justification: args.formData.compensationJustification,
    budget_total: String(total),
    budget_previous_funding: toYesNo(args.formData.prevFunding),
    budget_previous_details: args.formData.prevFundingDetails,
    budget_other_sources: toYesNo(args.formData.otherFunding),
    budget_other_sources_details: args.formData.otherFundingDetails,
    risk_implementation: args.formData.implRisks,
    risk_side_effects: args.formData.sideEffects,
    risk_metrics: args.formData.successMetrics,
    schedule_startup: args.formData.startupAmount,
    schedule_startup_justification: args.formData.startupJustification,
    schedule_milestones: buildMilestonesText(args.milestones),
    supporting_documents: buildDocumentsText(args.documents),
  });

  return `https://github.com/${owner}/${name}/issues/new?${params.toString()}`;
}

export interface ApplyPageProps {
  defaultGithub?: string;
  defaultOrg?: string;
  defaultHowLearn?: string;
  defaultTitle?: string;
  defaultAmount?: string;
  defaultCategory?: string;
  defaultLeadName?: string;
  defaultLeadRole?: string;
  defaultLeadBg?: string;
  defaultLeadResp?: string;
  defaultSummary?: string;
  defaultDescription?: string;
  defaultProblem?: string;
  defaultSolution?: string;
  defaultSolutionFormat?: string;
  defaultDependencies?: string;
  defaultTechApproach?: string;
  defaultUpstream?: string;
  defaultHardware?: string;
  defaultServices?: string;
  defaultCompensation?: string;
  defaultHardwareJustification?: string;
  defaultServiceJustification?: string;
  defaultCompensationJustification?: string;
  defaultPrevFunding?: "yes" | "no";
  defaultOtherFunding?: "yes" | "no";
  defaultPrevFundingDetails?: string;
  defaultOtherFundingDetails?: string;
  defaultImplRisks?: string;
  defaultSideEffects?: string;
  defaultSuccessMetrics?: string;
  defaultStartupAmount?: string;
  defaultStartupJustification?: string;
  defaultTermsAccepted?: boolean[];
  defaultTeamMembers?: { name: string; role: string; bg: string; resp: string }[];
  defaultMilestones?: { amount: string; date: string; stories: string[]; deliverables: string[]; criteria: string }[];
  defaultDocuments?: { name: string; url: string; desc: string }[];
}

export default function ApplyPage({
  defaultGithub = "",
  defaultOrg = "",
  defaultHowLearn = "",
  defaultTitle = "",
  defaultAmount = "",
  defaultCategory = "",
  defaultLeadName = "",
  defaultLeadRole = "",
  defaultLeadBg = "",
  defaultLeadResp = "",
  defaultSummary = "",
  defaultDescription = "",
  defaultProblem = "",
  defaultSolution = "",
  defaultSolutionFormat = "",
  defaultDependencies = "",
  defaultTechApproach = "",
  defaultUpstream = "",
  defaultHardware = "0",
  defaultServices = "0",
  defaultCompensation = "0",
  defaultHardwareJustification = "",
  defaultServiceJustification = "",
  defaultCompensationJustification = "",
  defaultPrevFunding = "no",
  defaultOtherFunding = "no",
  defaultPrevFundingDetails = "",
  defaultOtherFundingDetails = "",
  defaultImplRisks = "",
  defaultSideEffects = "",
  defaultSuccessMetrics = "",
  defaultStartupAmount = "0",
  defaultStartupJustification = "",
  defaultTermsAccepted = new Array(9).fill(false),
  defaultTeamMembers = [],
  defaultMilestones = [],
  defaultDocuments = [],
}: ApplyPageProps) {
  const router = useRouter();
  const applyTab =
    router.isReady && router.query.tab === "coinholder"
      ? "coinholder"
      : router.isReady && router.query.tab === "zechub"
        ? "zechub"
        : "zcg";

  const setApplyTab = (v: string) => {
    const next: Record<string, string | string[] | undefined> = {
      ...router.query,
    };
    if (v === "zcg") {
      delete next.tab;
    } else {
      next.tab = v;
    }
    void router.replace({ pathname: "/apply", query: next }, undefined, {
      shallow: true,
    });
  };

  const zechubCreateUrl = zechubDaoCreateProposalUrl();
  const zechubDaoUrl = zechubDaoDaodaoUrl();

  const [step, setStep] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState<boolean[]>(
    defaultTermsAccepted.length === 9
      ? [...defaultTermsAccepted]
      : new Array(9).fill(false)
  );
  const [formData, setFormData] = useState({
    github: defaultGithub, org: defaultOrg, howLearn: defaultHowLearn,
    title: defaultTitle, amount: defaultAmount, category: defaultCategory,
    leadName: defaultLeadName, leadRole: defaultLeadRole, leadBg: defaultLeadBg, leadResp: defaultLeadResp,
    summary: defaultSummary, description: defaultDescription, problem: defaultProblem, solution: defaultSolution,
    solutionFormat: defaultSolutionFormat, dependencies: defaultDependencies, techApproach: defaultTechApproach, upstream: defaultUpstream,
    hardware: defaultHardware, services: defaultServices, compensation: defaultCompensation,
    hardwareJustification: defaultHardwareJustification, serviceJustification: defaultServiceJustification, compensationJustification: defaultCompensationJustification,
    prevFunding: defaultPrevFunding, otherFunding: defaultOtherFunding,
    prevFundingDetails: defaultPrevFundingDetails, otherFundingDetails: defaultOtherFundingDetails,
    implRisks: defaultImplRisks, sideEffects: defaultSideEffects, successMetrics: defaultSuccessMetrics,
    startupAmount: defaultStartupAmount, startupJustification: defaultStartupJustification,
  });
  const [teamMembers, setTeamMembers] = useState<{ name: string; role: string; bg: string; resp: string }[]>(defaultTeamMembers);
  const [milestones, setMilestones] = useState<{ amount: string; date: string; stories: string[]; deliverables: string[]; criteria: string }[]>(defaultMilestones);
  const [documents, setDocuments] = useState<{ name: string; url: string; desc: string }[]>(defaultDocuments);
  const [confirmed, setConfirmed] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRealDraftNotice, setShowRealDraftNotice] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const draftRestoredRef = useRef(false);
  const allTermsAccepted = termsAccepted.every(Boolean);

  useEffect(() => {
    if (!router.isReady || applyTab !== "zcg" || draftRestoredRef.current) return;
    const d = loadZcgApplyDraft();
    if (!d) return;
    draftRestoredRef.current = true;
    setStep(Math.min(Math.max(0, d.step), 9));
    const ta = [...d.termsAccepted];
    while (ta.length < 9) ta.push(false);
    setTermsAccepted(ta.slice(0, 9));
    setFormData((prev) => ({ ...prev, ...d.formData }));
    setTeamMembers(d.teamMembers?.length ? d.teamMembers.map((m) => ({ ...m })) : []);
    setMilestones(
      d.milestones?.length
        ? d.milestones.map((m) => ({
            ...m,
            stories: [...m.stories],
            deliverables: [...m.deliverables],
          }))
        : []
    );
    setDocuments(d.documents?.length ? d.documents.map((x) => ({ ...x })) : []);
    setDraftNotice("Restored a saved draft from this browser.");
  }, [router.isReady, applyTab]);

  const updateField = (key: string, val: string) => setFormData(prev => ({ ...prev, [key]: val }));
  const total = Number(formData.hardware) + Number(formData.services) + Number(formData.compensation);

  const addMilestone = () => setMilestones(prev => [...prev, { amount: "", date: "", stories: [""], deliverables: [""], criteria: "" }]);
  const removeMilestone = (i: number) => setMilestones(prev => prev.filter((_, idx) => idx !== i));
  const addStory = (milestoneIdx: number) =>
    setMilestones((prev) => {
      const next = [...prev];
      next[milestoneIdx] = {
        ...next[milestoneIdx],
        stories: [...next[milestoneIdx].stories, ""],
      };
      return next;
    });
  const removeStory = (milestoneIdx: number, storyIdx: number) =>
    setMilestones((prev) => {
      const next = [...prev];
      next[milestoneIdx] = {
        ...next[milestoneIdx],
        stories: next[milestoneIdx].stories.filter((_, idx) => idx !== storyIdx),
      };
      return next;
    });
  const addDeliverable = (milestoneIdx: number) =>
    setMilestones((prev) => {
      const next = [...prev];
      next[milestoneIdx] = {
        ...next[milestoneIdx],
        deliverables: [...next[milestoneIdx].deliverables, ""],
      };
      return next;
    });
  const removeDeliverable = (milestoneIdx: number, deliverableIdx: number) =>
    setMilestones((prev) => {
      const next = [...prev];
      next[milestoneIdx] = {
        ...next[milestoneIdx],
        deliverables: next[milestoneIdx].deliverables.filter((_, idx) => idx !== deliverableIdx),
      };
      return next;
    });

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
          program: "zcg",
          formData,
          termsAccepted,
          teamMembers,
          milestones,
          documents,
        }),
      });
      const result = (await response.json()) as { issueUrl?: string; error?: string };
      if (!response.ok) {
        throw new Error(result.error || "Failed to create issue.");
      }
      if (!result.issueUrl) {
        throw new Error("Issue created but URL missing in response.");
      }
      clearZcgApplyDraft();
      window.open(result.issueUrl, "_blank");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create issue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitRealDraftToGitHub = () => {
    const issueUrl = buildIssueDraftUrl({
      github: formData.github,
      formData,
      teamMembers,
      milestones,
      documents,
    });
    if (!issueUrl) {
      setSubmitError("Could not build real draft issue URL.");
      return;
    }
    window.open(issueUrl, "_blank");
  };

  const handleSubmitRealDraftToGitHub = () => {
    setShowRealDraftNotice(true);
  };

  const handleSaveDraft = () => {
    try {
      saveZcgApplyDraft({
        step,
        termsAccepted: [...termsAccepted],
        formData: { ...formData },
        teamMembers: teamMembers.map((m) => ({ ...m })),
        milestones: milestones.map((m) => ({
          ...m,
          stories: [...m.stories],
          deliverables: [...m.deliverables],
        })),
        documents: documents.map((d) => ({ ...d })),
      });
      setDraftNotice("Draft saved in this browser. It is cleared after a successful submit.");
    } catch {
      setDraftNotice("Could not save draft.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <h1 className="mb-1 text-2xl font-bold text-foreground sm:text-3xl">
        Apply for a grant
      </h1>
      <p className="mb-4 text-sm text-muted-foreground sm:mb-6 sm:text-base">
        Choose <span className="font-medium text-foreground">ZCG</span> for
        forward-looking proposals,{" "}
        <span className="font-medium text-foreground">Coinholder</span> for Lockbox
        retroactive (completed work) applications, or{" "}
        <span className="font-medium text-foreground">ZecHub DAO</span> for on-chain
        mini-grants via DAO DAO on Juno. Connect GitHub before submitting ZCG or
        Coinholder forms.
      </p>

      <Tabs value={applyTab} onValueChange={setApplyTab} className="w-full">
        <TabsList className="mb-6 grid h-auto w-full max-w-xl grid-cols-3 p-1 sm:w-auto">
          <TabsTrigger value="zcg" className="px-2 py-2 text-xs sm:px-3 sm:text-sm">
            ZCG
          </TabsTrigger>
          <TabsTrigger value="coinholder" className="px-2 py-2 text-xs sm:px-3 sm:text-sm">
            Coinholder
          </TabsTrigger>
          <TabsTrigger value="zechub" className="px-2 py-2 text-xs sm:px-3 sm:text-sm">
            ZecHub DAO
          </TabsTrigger>
        </TabsList>

        <TabsContent value="zcg" className="mt-0 outline-none focus-visible:ring-0">
          <h2 className="mb-1 text-xl font-semibold text-foreground sm:text-2xl">
            Zcash Community Grants
          </h2>
          {/* <p className="mb-4 text-sm text-muted-foreground sm:mb-6 sm:text-base">
            Forward-looking applications.{" "}
            <Link href="/grants?program=zcg" className="text-primary hover:underline">
              Browse ZCG grants
            </Link>
            .
          </p> */}

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
                  <label className="mb-1 block text-sm font-medium text-foreground">Application Owners (@Octocat, @Octocat1) *</label>
                  <Input value={formData.github} onChange={e => updateField("github", e.target.value)} placeholder="@owner1, @owner2" className="bg-secondary" />
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
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Hardware/Software Justification</label>
                  <Textarea value={formData.hardwareJustification} onChange={e => updateField("hardwareJustification", e.target.value)} className="bg-secondary" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Service Costs Justification</label>
                  <Textarea value={formData.serviceJustification} onChange={e => updateField("serviceJustification", e.target.value)} className="bg-secondary" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Compensation Costs Justification</label>
                  <Textarea value={formData.compensationJustification} onChange={e => updateField("compensationJustification", e.target.value)} className="bg-secondary" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Previous Funding</label>
                  <Select value={formData.prevFunding} onValueChange={v => updateField("prevFunding", v)}>
                    <SelectTrigger className="bg-secondary"><SelectValue placeholder="Select one" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Previous Funding Details</label>
                  <Textarea value={formData.prevFundingDetails} onChange={e => updateField("prevFundingDetails", e.target.value)} className="bg-secondary" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Other Funding Sources</label>
                  <Select value={formData.otherFunding} onValueChange={v => updateField("otherFunding", v)}>
                    <SelectTrigger className="bg-secondary"><SelectValue placeholder="Select one" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">Other Funding Sources Details</label>
                  <Textarea value={formData.otherFundingDetails} onChange={e => updateField("otherFundingDetails", e.target.value)} className="bg-secondary" />
                </div>
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
                  <div className="mt-3">
                    <label className="mb-1 block text-sm font-medium text-foreground">Startup Funding Justification</label>
                    <Textarea value={formData.startupJustification} onChange={e => updateField("startupJustification", e.target.value)} className="bg-secondary" />
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
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">User Stories</label>
                      <div className="space-y-2">
                        {m.stories.map((story, storyIdx) => (
                          <div key={storyIdx} className="flex items-center gap-2">
                            <Input
                              value={story}
                              placeholder='As a [type of user], I want [some goal], so that [some reason]'
                              onChange={e => setMilestones(prev => { const n = [...prev]; const stories = [...n[i].stories]; stories[storyIdx] = e.target.value; n[i] = { ...n[i], stories }; return n; })}
                              className="bg-secondary"
                            />
                            {m.stories.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeStory(i, storyIdx)}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => addStory(i)} className="gap-2">
                          <Plus className="h-3.5 w-3.5" /> Add User Story
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted-foreground">Deliverables</label>
                      <div className="space-y-2">
                        {m.deliverables.map((deliverable, deliverableIdx) => (
                          <div key={deliverableIdx} className="flex items-center gap-2">
                            <Input
                              value={deliverable}
                              placeholder="[List specific deliverables that fulfill the user stories]"
                              onChange={e => setMilestones(prev => { const n = [...prev]; const deliverables = [...n[i].deliverables]; deliverables[deliverableIdx] = e.target.value; n[i] = { ...n[i], deliverables }; return n; })}
                              className="bg-secondary"
                            />
                            {m.deliverables.length > 1 && (
                              <Button type="button" variant="ghost" size="icon" onClick={() => removeDeliverable(i, deliverableIdx)}>
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => addDeliverable(i)} className="gap-2">
                          <Plus className="h-3.5 w-3.5" /> Add Deliverable
                        </Button>
                      </div>
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
                    <Input placeholder="Description" value={d.desc} onChange={e => setDocuments(prev => { const n = [...prev]; n[i] = { ...n[i], desc: e.target.value }; return n; })} className="bg-secondary" />
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
                <Button
                  size="lg"
                  disabled={!confirmed || !allTermsAccepted || isSubmitting}
                  className="w-full gap-2 bg-primary font-semibold text-primary-foreground"
                  onClick={() => void handleSubmitToGitHub()}
                >
                  <FileText className="h-4 w-4" /> {isSubmitting ? "Submitting..." : "Submit Grant Application"}
                </Button>
                {submitError && (
                  <p className="text-sm text-destructive">{submitError}</p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={!confirmed || !allTermsAccepted}
                  onClick={handleSubmitRealDraftToGitHub}
                >
                  <FileText className="h-4 w-4" /> Create Draft Grant Application
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="mt-4 space-y-2 border-t border-border/50 pt-4 sm:mt-6 sm:pt-6">
            <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1 text-muted-foreground"
              onClick={handleSaveDraft}
            >
              <Save className="h-3.5 w-3.5" /> Save Draft
            </Button>
            <div className="flex gap-2 sm:gap-3">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1">
                  <ChevronLeft className="h-4 w-4" /> Back
                </Button>
              )}
              {step < 9 && (
                <Button onClick={() => setStep(step + 1)} disabled={step === 0 && !allTermsAccepted} className="gap-1 bg-primary text-primary-foreground">
                  Continue <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
            </div>
            {draftNotice && applyTab === "zcg" && (
              <p className="text-xs text-muted-foreground">{draftNotice}</p>
            )}
          </div>
        </div>
      </div>
        </TabsContent>

        <TabsContent value="coinholder" className="mt-0 outline-none focus-visible:ring-0">
          <CoinholderApplyWizard embedded />
        </TabsContent>

        <TabsContent value="zechub" className="mt-0 outline-none focus-visible:ring-0">
          <h2 className="mb-1 text-xl font-semibold text-foreground sm:text-2xl">
            ZecHub DAO (on-chain)
          </h2>
          <p className="mb-6 max-w-2xl text-sm text-muted-foreground sm:text-base">
            ZecHub mini-grants and governance run on{" "}
            <span className="font-medium text-foreground/90">DAO DAO</span> on{" "}
            <span className="font-medium text-foreground/90">Juno</span>. You do not file a
            GitHub issue here—connect a wallet on DAO DAO to create proposals, vote when voting
            is open, and follow execution there.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Create a proposal</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Open the official proposal builder, draft your title and description (markdown
                  supported), add actions such as spends or contract messages, then submit and sign
                  with your Juno wallet.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button className="gap-2" asChild>
                    <a href={zechubCreateUrl} target="_blank" rel="noopener noreferrer">
                      <FileEdit className="h-4 w-4" />
                      Create proposal on DAO DAO
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href={zechubDaoUrl} target="_blank" rel="noopener noreferrer">
                      <Scale className="h-4 w-4" />
                      Open ZecHub DAO
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Browse & vote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  This hub lists proposals from the DAO DAO indexer. Use{" "}
                  <span className="font-medium text-foreground/90">Vote on DAO DAO</span> on a
                  proposal when its status is open for voting.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="gap-2" asChild>
                    <Link href="/zechub/proposals">Browse ZecHub proposals</Link>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" asChild>
                    <a href={zechubDaoUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      DAO DAO UI
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="mt-4 border-border/50 bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Learn more</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center">
              <Button variant="outline" size="sm" className="w-fit gap-2" asChild>
                <Link href="/zechub/proposals/guide">
                  <BookOpen className="h-4 w-4" />
                  How to create proposals & vote
                </Link>
              </Button>
              <a
                href="https://zechub.wiki/dao"
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit text-primary underline-offset-2 hover:underline"
              >
                ZecHub DAO docs (wiki)
              </a>
              <a
                href="https://docs.daodao.zone/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-fit text-primary underline-offset-2 hover:underline"
              >
                DAO DAO documentation
              </a>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog
        open={showRealDraftNotice}
        onOpenChange={setShowRealDraftNotice}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Manual Check Needed Before Final GitHub Submit</AlertDialogTitle>
            <AlertDialogDescription>
              GitHub issue-form interactive controls can behave differently from API-created markdown.
              Please review these fields manually on the opened GitHub issue page:
              {"\n"}- Terms and Conditions checkboxes
              {"\n"}- Category (dropdown value)
              {"\n"}- Previous Funding (Yes/No dropdown)
              {"\n"}- Other Funding Sources (Yes/No dropdown)
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                submitRealDraftToGitHub();
              }}
            >
              Continue and Create Draft
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
