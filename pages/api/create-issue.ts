import type { NextApiRequest, NextApiResponse } from "next";
import { Octokit } from "@octokit/rest";
import {
  buildCoinholderIssueBody,
  type CoinholderFormData,
  COINHOLDER_TERMS_COUNT,
} from "@/lib/coinholderApplyIssue";
import { getIssueRepoSlug } from "@/lib/grantPrograms";

type CreateIssueSuccess = { issueUrl: string };
type CreateIssueError = { error: string };

type FormDataPayload = {
  github: string;
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
  hardwareJustification: string;
  serviceJustification: string;
  compensationJustification: string;
  prevFunding: string;
  otherFunding: string;
  prevFundingDetails: string;
  otherFundingDetails: string;
  implRisks: string;
  sideEffects: string;
  successMetrics: string;
  startupAmount: string;
  startupJustification: string;
};

type Payload = {
  formData: FormDataPayload;
  termsAccepted: boolean[];
  teamMembers: { name: string; role: string; bg: string; resp: string }[];
  milestones: { amount: string; date: string; stories: string[]; deliverables: string[]; criteria: string }[];
  documents: { name: string; url: string; desc: string }[];
};

type CoinholderPayload = {
  program: "coinholder";
  formData: CoinholderFormData;
  termsAccepted: boolean[];
};

function isCoinholderPayload(body: unknown): body is CoinholderPayload {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    b.program === "coinholder" &&
    typeof b.formData === "object" &&
    b.formData !== null
  );
}

function yesNo(v: string): string {
  return v === "yes" ? "Yes" : "No";
}

function normalizeAssignees(value: string): string {
  return value
    .split(",")
    .map((v) => v.trim().replace(/^@+/, ""))
    .filter(Boolean)
    .join(", ");
}

function checkboxLine(label: string, checked: boolean): string {
  return `- [${checked ? "x" : " "}] ${label}`;
}

function milestonesMarkdown(
  milestones: Payload["milestones"]
): string {
  if (!milestones.length) return "_Not provided_";
  return milestones
    .map((m, i) => {
      const stories = (m.stories || []).filter(Boolean);
      const deliverables = (m.deliverables || []).filter(Boolean);
      return [
        `- Milestone: ${i + 1}`,
        `  Amount (USD): ${m.amount || "0"}`,
        `  Expected Completion Date: ${m.date || "YYYY-MM-DD"}`,
        "  User Stories:",
        ...(stories.length
          ? stories.map((s) => `    - "${s}"`)
          : [
              '    - "As a [type of user], I want [some goal], so that [some reason]"',
              '    - "As a [different type of user], I want [some goal], so that [some reason]" (optional - add more as needed)',
            ]),
        "  Deliverables:",
        ...(deliverables.length
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

function documentsMarkdown(documents: Payload["documents"]): string {
  if (!documents.length) return "_None_";
  return documents
    .map((d, i) => {
      const label = d.name || `File Name ${i + 1}`;
      const desc = d.desc || "Supporting file";
      const url = d.url ? ` (${d.url})` : "";
      return `- ${label}: ${desc}${url}`;
    })
    .join("\n");
}

function issueBody(payload: Payload): string {
  const t = payload.termsAccepted || [];
  const f = payload.formData;
  const teamMembers = payload.teamMembers?.length
    ? payload.teamMembers
        .map(
          (m) =>
            `- Name: ${m.name || ""}\n  Role: ${m.role || ""}\n  Background: ${m.bg || ""}\n  Responsibilities: ${m.resp || ""}`
        )
        .join("\n")
    : "None or N/A";

  const budgetTotal =
    Number(f.hardware || 0) + Number(f.services || 0) + Number(f.compensation || 0);

  return [
    "## Terms and Conditions",
    checkboxLine("I agree to the Grant Agreement terms if funded", !!t[0]),
    checkboxLine("I agree to Provide KYC information if funded above $50,000 USD", !!t[1]),
    checkboxLine("I agree to disclose conflicts of interest", !!t[2]),
    checkboxLine("I agree to adhere to the Code of Conduct and Communication Guidelines", !!t[3]),
    checkboxLine(
      "I understand all milestone deliverables will be validated and accepted by their intended users or their representatives, who will confirm that the deliverables meet the required quality, functionality, and usability for each user story.",
      !!t[4]
    ),
    checkboxLine(
      "I agree that for any new open-source software, I will create a CONTRIBUTING.md file that reflects the high standards of Zcash development, using the librustzcash style guides as a primary reference.",
      !!t[5]
    ),
    checkboxLine(
      "I understand when contributing to existing Zcash code, I am required to adhere to the project specific contribution guidelines, paying close attention to any merge, branch, pull request, and commit guidelines as exemplified in the librustzcash repository.",
      !!t[6]
    ),
    checkboxLine("I agree to post request details on the Community Forum", !!t[7]),
    checkboxLine(
      "I understand it is my responsibility to post a link to this issue on the Zcash Community Forums after this application has been submitted so the community can give input. I understand this is required in order for ZCG to discuss and vote on this grant application.",
      !!t[8]
    ),
    "",
    "## Application Owners (@Octocat, @Octocat1)",
    normalizeAssignees(f.github) || "_Not provided_",
    "",
    "## Organization Details",
    "### Organization Name",
    f.org || "_Not provided_",
    "",
    "### How did you learn about Zcash Community Grants",
    f.howLearn || "_Not provided_",
    "",
    "## Project Overview",
    "### Requested Grant Amount (USD)",
    f.amount || "_Not provided_",
    "",
    "### Category",
    f.category || "_Not provided_",
    "",
    "## Team Information",
    "### Project Lead",
    `Name: ${f.leadName || ""}\nRole: ${f.leadRole || ""}\nBackground: ${f.leadBg || ""}\nResponsibilities: ${f.leadResp || ""}`,
    "",
    "### Additional Team Members",
    teamMembers,
    "",
    "## Project Details",
    "### Project Summary",
    f.summary || "_Not provided_",
    "",
    "### Project Description",
    f.description || "_Not provided_",
    "",
    "### Proposed Problem",
    f.problem || "_Not provided_",
    "",
    "### Proposed Solution",
    f.solution || "_Not provided_",
    "",
    "### Solution Format",
    f.solutionFormat || "_Not provided_",
    "",
    "### Dependencies",
    f.dependencies || "_Not provided_",
    "",
    "### Technical Approach",
    f.techApproach || "_Not provided_",
    "",
    "### Upstream Merge Opportunities",
    f.upstream || "_Not provided_",
    "",
    "## Budget",
    "### Hardware/Software Costs (USD)",
    f.hardware || "0",
    "",
    "### Hardware/Software Justification",
    f.hardwareJustification || "_Not provided_",
    "",
    "### Service Costs (USD)",
    f.services || "0",
    "",
    "### Service Costs Justification",
    f.serviceJustification || "_Not provided_",
    "",
    "### Compensation Costs (USD)",
    f.compensation || "0",
    "",
    "### Compensation Costs Justification",
    f.compensationJustification || "_Not provided_",
    "",
    "### Total Budget (USD)",
    String(budgetTotal),
    "",
    "### Previous Funding",
    yesNo(f.prevFunding),
    "",
    "### Previous Funding Details",
    f.prevFundingDetails || "_Not provided_",
    "",
    "### Other Funding Sources",
    yesNo(f.otherFunding),
    "",
    "### Other Funding Sources Details",
    f.otherFundingDetails || "_Not provided_",
    "",
    "## Risk Assessment",
    "### Implementation Risks",
    f.implRisks || "_Not provided_",
    "",
    "### Potential Side Effects",
    f.sideEffects || "_Not provided_",
    "",
    "### Success Metrics",
    f.successMetrics || "_Not provided_",
    "",
    "## Project Schedule",
    "### Startup Funding (USD)",
    f.startupAmount || "0",
    "",
    "### Startup Funding Justification",
    f.startupJustification || "_Not provided_",
    "",
    "### Milestone Details",
    milestonesMarkdown(payload.milestones),
    "",
    "### Supporting Documents",
    documentsMarkdown(payload.documents),
  ].join("\n");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateIssueSuccess | CreateIssueError>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(500).json({ error: "Only POST is supported." });
  }

  // Auth setup: we use the logged-in GitHub OAuth access token from the
  // existing frontend session and send it as Authorization: Bearer <token>.
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!token) {
    return res.status(401).json({ error: "Not authenticated. Connect GitHub first." });
  }

  if (isCoinholderPayload(req.body)) {
    const { formData, termsAccepted } = req.body;
    if (
      !termsAccepted ||
      termsAccepted.length !== COINHOLDER_TERMS_COUNT ||
      !termsAccepted.every(Boolean)
    ) {
      return res.status(400).json({
        error:
          "All terms, conditions, and the community forum posting confirmation must be accepted.",
      });
    }

    const slug = getIssueRepoSlug("coinholder");
    const [owner, repoName] = slug.split("/");
    if (!owner || !repoName) {
      return res.status(500).json({ error: "Invalid Coinholder repository configuration." });
    }

    try {
      const octokit = new Octokit({ auth: token });
      const result = await octokit.issues.create({
        owner,
        repo: repoName,
        title: `Retroactive Grant Application - ${formData.applicationTitle || "Application Name"}`,
        labels: ["Pending Retroactive Grant Application"],
        body: buildCoinholderIssueBody(formData, termsAccepted),
        assignees: normalizeAssignees(formData.github)
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      });
      return res.status(200).json({ issueUrl: result.data.html_url });
    } catch (error: any) {
      return handleOctokitError(res, error);
    }
  }

  const payload = req.body as Payload;
  if (!payload?.formData) {
    return res.status(500).json({ error: "Invalid request body." });
  }

  const slug = getIssueRepoSlug("zcg");
  const [owner, repoName] = slug.split("/");
  if (!owner || !repoName) {
    return res.status(500).json({ error: "Invalid repository configuration." });
  }

  try {
    const octokit = new Octokit({ auth: token });
    const result = await octokit.issues.create({
      owner,
      repo: repoName,
      title: `Grant Application - ${payload.formData.title || "Application Name"}`,
      labels: ["Pending Grant Application"],
      body: issueBody(payload),
      assignees: normalizeAssignees(payload.formData.github)
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    });

    return res.status(200).json({ issueUrl: result.data.html_url });
  } catch (error: any) {
    return handleOctokitError(res, error);
  }
}

function handleOctokitError(
  res: NextApiResponse<CreateIssueSuccess | CreateIssueError>,
  error: any
) {
  const status = error?.status as number | undefined;
  if (status === 401) {
    return res.status(401).json({ error: "GitHub token is invalid or expired." });
  }
  if (status === 404) {
    return res.status(500).json({
      error:
        "GitHub API returned Not Found. This usually means the token lacks write scope for issues (public_repo/repo) or has no access to the target repository.",
    });
  }
  if (status === 403) {
    return res.status(403).json({
      error:
        "Forbidden by GitHub API. Check token scopes and repository permissions.",
    });
  }
  return res.status(500).json({
    error: error?.message || "Failed to create GitHub issue.",
  });
}
