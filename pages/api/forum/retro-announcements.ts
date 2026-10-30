import type { NextApiRequest, NextApiResponse } from "next";
import {
  announcementKind,
  type RetroAnnouncement,
} from "@/lib/retroRounds";

type Ok = { announcements: RetroAnnouncement[]; fetchedAt: string };
type Err = { error: string };

const FORUM = "https://forum.zcashcommunity.com";
/** Retroactive Grants subcategory, plus the governance category early posts used. */
const CATEGORY_IDS = new Set([54, 25]);
const TTL_MS = 10 * 60 * 1000;

interface DiscourseSearchTopic {
  id?: number;
  title?: string;
  slug?: string;
  created_at?: string;
  category_id?: number;
}

let cache: { body: Ok; at: number } | null = null;

/** Organizer posts are titled around the program name; applicant threads are not. */
const isOrganizerTitle = (title: string) =>
  /coinholder-directed/i.test(title) && !/^(application|retroactive grant application)/i.test(title);

async function load(): Promise<Ok> {
  const q = encodeURIComponent('"Coinholder-Directed" in:title order:latest');
  const res = await fetch(`${FORUM}/search.json?q=${q}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Forum search failed (${res.status})`);
  const data = (await res.json()) as { topics?: DiscourseSearchTopic[] };
  const announcements = (data.topics ?? [])
    .filter(
      (t): t is Required<DiscourseSearchTopic> =>
        typeof t.id === "number" &&
        typeof t.title === "string" &&
        typeof t.created_at === "string" &&
        CATEGORY_IDS.has(t.category_id ?? -1) &&
        isOrganizerTitle(t.title)
    )
    .map((t) => ({
      id: t.id,
      title: t.title,
      href: `${FORUM}/t/${t.slug ?? "topic"}/${t.id}`,
      createdAt: t.created_at,
      kind: announcementKind(t.title),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { announcements, fetchedAt: new Date().toISOString() };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Ok | Err>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    if (!cache || Date.now() - cache.at > TTL_MS) {
      try {
        cache = { body: await load(), at: Date.now() };
      } catch (e) {
        if (!cache) throw e;
      }
    }
    res.setHeader("Cache-Control", "public, s-maxage=600, stale-while-revalidate=1800");
    return res.status(200).json(cache.body);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return res.status(502).json({ error: msg });
  }
}
