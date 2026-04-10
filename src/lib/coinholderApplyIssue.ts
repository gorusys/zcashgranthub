/** Payload fields for Lockbox / Coinholder retroactive grant GitHub issue (issue form template). */

export interface CoinholderFormData {
  github: string;
  organizationOrIndividualName: string;
  additionalTeamMembers: string;
  discovery: string;
  applicationTitle: string;
  requestedAmountUsd: string;
  category: string;
  projectSummary: string;
  projectDescription: string;
  technicalApproach: string;
  timePeriod: string;
  totalBudgetUsd: string;
  budgetBreakdown: string;
  prevFunding: "yes" | "no";
  prevFundingDetails: string;
  otherFunding: "yes" | "no";
  otherFundingDetails: string;
  successMetrics: string;
  proofOfCompletion: string;
  conflictOfInterest: string;
}

export const COINHOLDER_CATEGORIES = [
  "Infrastructure",
  "Community",
  "Education",
  "Non-Wallet Applications",
  "Integration",
  "Wallets",
  "Research & Development",
  "Media",
  "Zcash Protocol Extension",
  "Dedicated Resource",
  "Retroactive Event Funding",
] as const;

/** Default textarea skeleton for additional team members (YAML-style). */
export const DEFAULT_COINHOLDER_TEAM_MEMBERS = `- Name:
  Role:
  Background:
  Responsibilities:
- Name:
  Role:
  Background:
  Responsibilities:
`;

export const DEFAULT_COINHOLDER_BUDGET_BREAKDOWN = `- Compensation:
  - $(USD): null
  - Justification: null
- Technology/Software:
  - $(USD): null
  - Justification: null
- Infrastructure/Hosting:
  - $(USD): null
  - Justification: null
- Services/Contractors:
  - $(USD): null
  - Justification: null
- Other:
  - $(USD): null
  - Justification: null
- Total $(USD): 
`;

export const DEFAULT_PROOF_OF_COMPLETION = `- Repository/Commit:
  - [Repository](https://) - details
- Publication:
  - [Published](https://) - details
- Deployment/Release:
  - [Release](https://) - details
- Other Evidence:
  - [Other](https://) - details
`;

export const COINHOLDER_TERMS_COUNT = 8;

function checkboxLine(label: string, checked: boolean): string {
  return `- [${checked ? "x" : " "}] ${label}`;
}

function yesNo(v: string): string {
  return v === "yes" ? "Yes" : "No";
}

/**
 * Renders GitHub issue body matching the Coinholder retroactive issue form sections.
 */
export function buildCoinholderIssueBody(
  formData: CoinholderFormData,
  termsAccepted: boolean[]
): string {
  const t = termsAccepted;
  const f = formData;
  const teamBlock =
    f.additionalTeamMembers?.trim() ||
    "_Not provided — use None or N/A if sole applicant._";

  return [
    "## Terms and Conditions",
    checkboxLine(
      "I agree to the Grant Agreement terms if funded",
      !!t[0]
    ),
    checkboxLine(
      "I agree to Provide KYC information if funded above $50,000 USD",
      !!t[1]
    ),
    checkboxLine("I agree to disclose conflicts of interest", !!t[2]),
    checkboxLine(
      "I understand that this grant program is only eligible for completed work, as it is a retroactive grant program. Applications for planned or partially completed work will not be considered. All completed work will be verified and accepted by its intended users or their representatives, who will confirm that the outputs meet the required quality, functionality, and usability before the work is listed as an option for Coinholder voting.",
      !!t[3]
    ),
    checkboxLine(
      "I agree that for any new open-source software, I will create a CONTRIBUTING.md file that reflects the high standards of Zcash development, using the librustzcash style guides as a primary reference.",
      !!t[4]
    ),
    checkboxLine(
      "I understand when contributing to existing Zcash code, I am required to adhere to the project specific contribution guidelines, paying close attention to any merge, branch, pull request, and commit guidelines as exemplified in the librustzcash repository.",
      !!t[5]
    ),
    checkboxLine(
      "I understand all grants are valued in USD but will be disbursed in Shielded ZEC. I acknowledge and accept that disbursement amounts may fluctuate based on the ZEC/USD exchange rate at the time of payment.",
      !!t[6]
    ),
    "",
    "## Application Owners (@Octocat, @Octocat1)",
    f.github?.trim() || "_Not provided_",
    "",
    "## Applicant & Organization",
    "### Organization or Individual Name",
    f.organizationOrIndividualName?.trim() || "_Not provided_",
    "",
    "### Additional Team Members",
    "```yaml",
    teamBlock,
    "```",
    "",
    "### How did you learn about the Lockbox: Coinholder Retroactive Grants Program?",
    f.discovery?.trim() || "_Not provided_",
    "",
    "## Project Overview",
    "### Requested Grant Amount (USD)",
    f.requestedAmountUsd?.trim() || "_Not provided_",
    "",
    "### Category",
    f.category?.trim() || "_Not provided_",
    "",
    "### Project Summary",
    f.projectSummary?.trim() || "_Not provided_",
    "",
    "### Project Description",
    f.projectDescription?.trim() || "_Not provided_",
    "",
    "### Technical Approach (how you did it)",
    f.technicalApproach?.trim() || "_Not provided_",
    "",
    "### Time Period of Work Completion",
    f.timePeriod?.trim() || "_Not provided_",
    "",
    "## Budget & Funding",
    "### Total Budget (USD)",
    f.totalBudgetUsd?.trim() || "_Not provided_",
    "",
    "### Budget Breakdown",
    f.budgetBreakdown?.trim() || "_Not provided_",
    "",
    "### Previous Funding",
    yesNo(f.prevFunding),
    "",
    "### Previous Funding Details",
    f.prevFundingDetails?.trim() || "_Not provided_",
    "",
    "### Other Funding Sources",
    yesNo(f.otherFunding),
    "",
    "### Other Funding Sources Details",
    f.otherFundingDetails?.trim() || "_Not provided_",
    "",
    "## Impact & Evidence",
    "### Success Metrics",
    f.successMetrics?.trim() || "_Not provided_",
    "",
    "### Proof of completion",
    f.proofOfCompletion?.trim() || "_Not provided_",
    "",
    "### Conflict of Interest Disclosure",
    f.conflictOfInterest?.trim() || "_None disclosed_",
    "",
    "## Zcash Community Forums Post Requirement",
    checkboxLine(
      "I understand it is my responsibility to post a link to this issue on the Zcash Community Forums (Retroactive Grants category) after this application has been submitted so the community can give input. I understand this is required in order for the community to discuss and vote on this grant application. Note: If you are unable to post on the forum (for example, due to new user restrictions), please leave a comment below, and we will adjust your posting permissions.",
      !!t[7]
    ),
  ].join("\n");
}
