import type { NextApiRequest, NextApiResponse } from "next";
import type { CommunityGrantsForumTopic } from "@/lib/communityGrantsForumTopics";
import {
  ZCG_COMMUNITY_GRANTS_FORUM_CATEGORY_URL,
} from "@/lib/grantPrograms";

type Ok = { topics: CommunityGrantsForumTopic[]; page: number; hasMore: boolean };
type Err = { error: string };

interface DiscourseTopicRow {
  id?: number;
  title?: string;
  slug?: string;
  category_id?: number;
  posts_count?: number;
  last_posted_at?: string | null;
}

interface DiscourseCategoryResponse {
  topic_list?: {
    topics?: DiscourseTopicRow[];
    more_topics_url?: string | null;
  };
}
interface DiscourseCategoriesResponse {
  category_list?: {
    categories?: Array<{
      id?: number;
      name?: string;
      slug?: string;
    }>;
  };
}

function toSubcategoryLabel(name: string | null, categoryId: number | null): string | null {
  if (categoryId === 33) return "No subcategories";
  if (categoryId === 36) return "Applications";
  if (categoryId === 34) return "Community Grants Updates";
  if (categoryId === 54) return "Retroactive Grants";
  if (categoryId === 42) return "RFI - RFP Grants";
  if (categoryId === 12) return "Minor Grants";
  const n = (name ?? "").trim().toLowerCase();
  if (n === "applications") return "Applications";
  if (n === "community grants updates" || n === "zomg-updates") {
    return "Community Grants Updates";
  }
  if (n === "retroactive grants") return "Retroactive Grants";
  if (n === "rfi - rfp grants" || n === "rfi-rfp-grants") return "RFI - RFP Grants";
  if (n === "minor grants") return "Minor Grants";
  return null;
}

const FORUM_BASE = "https://forum.zcashcommunity.com";
const MAX_SCAN_PAGES = 40;

async function fetchCategoryPage(page: number): Promise<DiscourseCategoryResponse> {
  const url = new URL(`${ZCG_COMMUNITY_GRANTS_FORUM_CATEGORY_URL}.json`);
  // Discourse uses ?page=1 for the second page.
  if (page > 1) url.searchParams.set("page", String(page - 1));
  const resp = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
  });
  if (!resp.ok) {
    throw new Error(`Discourse ${resp.status}`);
  }
  return (await resp.json()) as DiscourseCategoryResponse;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const limitRaw = req.query.limit;
  const pageRaw = req.query.page;
  const searchRaw = req.query.search;
  const limit = Math.min(
    50,
    Math.max(1, parseInt(typeof limitRaw === "string" ? limitRaw : "30", 10) || 30)
  );
  const page = Math.max(
    1,
    parseInt(typeof pageRaw === "string" ? pageRaw : "1", 10) || 1
  );
  const search =
    typeof searchRaw === "string" ? searchRaw.trim().toLowerCase() : "";

  res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");

  try {
    const [firstPageData, categoriesResp] = await Promise.all([
      fetchCategoryPage(search ? 1 : page),
      fetch("https://forum.zcashcommunity.com/categories.json", {
        headers: {
          Accept: "application/json",
        },
      }),
    ]);
    const categories = new Map<number, string>();
    if (categoriesResp.ok) {
      const categoryData =
        (await categoriesResp.json()) as DiscourseCategoriesResponse;
      for (const cat of categoryData.category_list?.categories ?? []) {
        if (typeof cat.id === "number" && typeof cat.name === "string") {
          categories.set(cat.id, cat.name);
        }
      }
    }

    const allRows: DiscourseTopicRow[] = [];
    const seenIds = new Set<number>();
    const appendRows = (rows?: DiscourseTopicRow[]) => {
      for (const row of rows ?? []) {
        if (typeof row.id !== "number") continue;
        if (seenIds.has(row.id)) continue;
        seenIds.add(row.id);
        allRows.push(row);
      }
    };

    appendRows(firstPageData.topic_list?.topics);

    if (search) {
      let scanPage = 2;
      let hasMore = Boolean(firstPageData.topic_list?.more_topics_url);
      while (hasMore && scanPage <= MAX_SCAN_PAGES) {
        const nextPageData = await fetchCategoryPage(scanPage);
        appendRows(nextPageData.topic_list?.topics);
        hasMore = Boolean(nextPageData.topic_list?.more_topics_url);
        scanPage += 1;
      }
    }

    const filteredRows = search
      ? allRows.filter((row) => (row.title ?? "").toLowerCase().includes(search))
      : allRows;

    const start = search ? (page - 1) * limit : 0;
    const pageRows = filteredRows.slice(start, start + limit);

    const mapped: CommunityGrantsForumTopic[] = [];
    for (const row of pageRows) {
      if (typeof row.id !== "number" || typeof row.slug !== "string") continue;
      const categoryId = typeof row.category_id === "number" ? row.category_id : null;
      const categoryName = categoryId != null ? (categories.get(categoryId) ?? null) : null;
      mapped.push({
        id: row.id,
        title: row.title ?? `Topic #${row.id}`,
        slug: row.slug,
        href: `${FORUM_BASE}/t/${row.slug}/${row.id}`,
        categoryId,
        categoryName,
        subcategoryLabel: toSubcategoryLabel(categoryName, categoryId),
        postsCount: typeof row.posts_count === "number" ? row.posts_count : 0,
        lastPostedAt:
          typeof row.last_posted_at === "string" ? row.last_posted_at : null,
      });
    }

    const hasMore = search
      ? start + limit < filteredRows.length
      : Boolean(firstPageData.topic_list?.more_topics_url);

    return res.status(200).json({
      topics: mapped,
      page,
      hasMore,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load topics";
    return res.status(502).json({ error: message });
  }
}
