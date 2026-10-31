/** Shared desktop/mobile navigation. Detail pages are reached through their parent lists. */
export type NavItem = {
  label: string;
  href: string;
  description?: string;
  tab?: string;
  tabDefault?: boolean;
};

export type NavGroup = { id: string; label: string; items: NavItem[] };

export const navigationGroups: NavGroup[] = [
  {
    id: "explore", label: "Explore",
    items: [
      { label: "Home", href: "/", description: "Programs and funding overview" },
      { label: "Browse grants", href: "/grants", description: "ZCG and Coinholder applications" },
      { label: "Bounties & first issues", href: "/bounties", description: "Paid tasks and open-source contributions" },
      { label: "Projects & infrastructure", href: "/projects", description: "Funded teams and repository activity" },
    ],
  },
  {
    id: "funding", label: "Funding",
    items: [
      { label: "Find the right funding", href: "/find-funding" },
      { label: "Apply for ZCG funding", href: "/apply", tab: "zcg", tabDefault: true },
      { label: "Apply for Coinholder funding", href: "/apply?tab=coinholder", tab: "coinholder" },
      { label: "Coinholder retro rounds", href: "/retro" },
      { label: "ZecHub DAO proposals", href: "/zechub/proposals" },
      { label: "Create a ZecHub proposal", href: "/apply?tab=zechub", tab: "zechub" },
      { label: "ZecHub DAO guide", href: "/zechub/proposals/guide" },
    ],
  },
  {
    id: "insights", label: "Insights",
    items: [
      { label: "ZCG decisions archive", href: "/decisions" },
      { label: "Analytics", href: "/analytics" },
      { label: "Funding streams & NU7", href: "/funding-streams" },
      { label: "Forum discussions", href: "/forum/discussions" },
    ],
  },
  {
    id: "activity", label: "My activity",
    items: [
      { label: "My Applications", href: "/dashboard", tab: "applications", tabDefault: true },
      { label: "Milestone Reports", href: "/dashboard?tab=milestones", tab: "milestones" },
      { label: "Watchlist & notifications", href: "/dashboard?tab=notifications", tab: "notifications" },
    ],
  },
  {
    id: "resources", label: "Resources",
    items: [
      { label: "API & feeds", href: "/developers" },
      { label: "Deadlines calendar (.ics)", href: "/calendar.ics" },
      { label: "Grant updates (RSS)", href: "/feed.xml" },
      { label: "Donate & contribute", href: "/donate" },
      { label: "Contribute code", href: "/donate#contribute" },
    ],
  },
];

type NavLocation = { pathname: string; query: { tab?: string | string[] }; asPath: string };

export const isFeedLink = (href: string) => href === "/feed.xml" || href === "/calendar.ics";

export function isNavItemActive(item: NavItem, location: NavLocation): boolean {
  if (isFeedLink(item.href)) return false;
  const [path, fragment] = item.href.split("#");
  const pathname = path.split("?")[0];
  const current = location.pathname === "/apply/coinholder" ? "/apply" : location.pathname;
  if (current !== pathname && !(pathname === "/grants" && current.startsWith("/grants/")) &&
      !(pathname === "/zechub/proposals" && current.startsWith("/zechub/proposals/") && current !== "/zechub/proposals/guide")) return false;
  if (pathname === "/donate") return fragment ? location.asPath.split("#")[1] === fragment : !location.asPath.includes("#contribute");
  if (item.tab) {
    const tab = location.pathname === "/apply/coinholder" ? "coinholder" : location.query.tab;
    return tab === item.tab || (item.tabDefault === true && !tab);
  }
  return true;
}
