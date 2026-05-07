import { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Search,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCommunityGrantsForumTopics } from "@/hooks/useCommunityGrantsForumTopics";
import { ZCG_COMMUNITY_GRANTS_FORUM_CATEGORY_URL } from "@/lib/grantPrograms";
import { parsePageQuery } from "@/components/ListPagination";

type SortBy = "activity" | "replies" | "title";

function TopicSkeleton() {
  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-4">
        <div className="animate-pulse space-y-2">
          <div className="h-4 w-11/12 rounded bg-secondary" />
          <div className="h-3 w-1/2 rounded bg-secondary" />
        </div>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function sortTopics<T extends { title: string; postsCount: number; lastPostedAt: string | null }>(
  items: T[],
  sortBy: SortBy
): T[] {
  const list = [...items];
  if (sortBy === "title") {
    list.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
    );
    return list;
  }
  if (sortBy === "replies") {
    list.sort((a, b) => b.postsCount - a.postsCount);
    return list;
  }
  list.sort((a, b) => {
    const aTime = a.lastPostedAt ? new Date(a.lastPostedAt).getTime() : 0;
    const bTime = b.lastPostedAt ? new Date(b.lastPostedAt).getTime() : 0;
    return bTime - aTime;
  });
  return list;
}

export default function ForumDiscussionsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("activity");
  const page = router.isReady ? parsePageQuery(router.query.page) : 1;
  const { data, isLoading, isError, error } = useCommunityGrantsForumTopics({
    limit: 30,
    page,
    search,
  });

  const goToPage = (nextPage: number) => {
    const safePage = Math.max(1, nextPage);
    const nextQuery: Record<string, string | string[] | undefined> = {
      ...router.query,
    };
    if (safePage <= 1) delete nextQuery.page;
    else nextQuery.page = String(safePage);
    void router.replace(
      { pathname: "/forum/discussions", query: nextQuery },
      undefined,
      { shallow: true }
    );
  };

  const filteredTopics = useMemo(() => {
    const topics = data?.topics ?? [];
    return sortTopics(topics, sortBy);
  }, [data?.topics, sortBy]);

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <Head>
        <title>Forum discussions · Zcash Grants Hub</title>
        <meta
          name="description"
          content="Browse active Community Grants discussions from the Zcash forum."
        />
      </Head>

      <div className="mb-6 space-y-4 sm:mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              Forum discussions
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Live feed from the{" "}
              <a
                href={ZCG_COMMUNITY_GRANTS_FORUM_CATEGORY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline-offset-2 hover:underline"
              >
                Community Grants forum category
              </a>
              .
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" asChild>
              <Link href="/grants">
                <MessageSquare className="h-4 w-4" />
                Browse grants
              </Link>
            </Button>
            <Button className="gap-2" asChild>
              <a
                href={ZCG_COMMUNITY_GRANTS_FORUM_CATEGORY_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open forum
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 sm:justify-between">
        <div className="relative min-w-[280px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (page !== 1) goToPage(1);
            }}
            placeholder="Search topics..."
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="activity">Latest activity</SelectItem>
              <SelectItem value="replies">Most replies</SelectItem>
              <SelectItem value="title">Title A-Z</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isError && (
        <Card className="mb-6 border-red-500/30 bg-red-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-300">Could not load forum topics</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {error?.message ?? "Unexpected API error"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <TopicSkeleton key={idx} />
          ))}
        </div>
      )}

      {!isLoading && !isError && filteredTopics.length === 0 && (
        <div className="rounded-lg border border-border/50 bg-card px-6 py-12 text-center">
          <p className="text-sm text-muted-foreground">No discussions match your search.</p>
        </div>
      )}

      {!isLoading && filteredTopics.length > 0 && (
        <div className="space-y-3">
          {filteredTopics.map((topic) => {
            return (
              <a
                key={topic.id}
                href={topic.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-lg border border-border/50 bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card/80"
              >
                <div className="mb-1 text-sm font-medium text-foreground">{topic.title}</div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{topic.postsCount} posts</span>
                  <span>Last activity: {formatDate(topic.lastPostedAt)}</span>
                  {topic.subcategoryLabel && (
                    <Badge variant="outline" className="text-[10px] font-medium">
                      {topic.subcategoryLabel}
                    </Badge>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}

      {!isLoading && !isError && (
        <div className="mt-6 flex flex-col items-center gap-3 border-t border-border/50 pt-6 sm:flex-row sm:justify-center">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!data?.hasMore}
              onClick={() => goToPage(page + 1)}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Forum page {page}
            {data?.hasMore ? "" : " · End of available topics"}
          </p>
        </div>
      )}
    </div>
  );
}
