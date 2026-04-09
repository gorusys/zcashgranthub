import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/router";
import { Search, SlidersHorizontal, X, Loader2, AlertCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ZechubProposalCard,
  type ZechubProposalCardRow,
} from "@/components/ZechubProposalCard";
import {
  ListPagination,
  LIST_PAGE_SIZE,
  parsePageQuery,
  totalPagesForCount,
} from "@/components/ListPagination";
import { zechubDaoDaodaoUrl } from "@/lib/daodao/zechubConfig";

interface ListResponse {
  items: ZechubProposalCardRow[];
  nextStartBefore: number | null;
}

async function fetchPage(startBefore?: number): Promise<ListResponse> {
  const params = new URLSearchParams({ limit: "25" });
  if (startBefore !== undefined) {
    params.set("startBefore", String(startBefore));
  }
  const res = await fetch(`/api/daodao/proposals-list?${params}`);
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(err.error || `List failed (${res.status})`);
  }
  return res.json() as Promise<ListResponse>;
}

function ProposalCardSkeleton() {
  return (
    <div className="rounded-lg border border-border/50 bg-card p-5 animate-pulse">
      <div className="mb-3 flex gap-2">
        <div className="h-5 w-14 rounded-full bg-secondary" />
        <div className="h-5 w-20 rounded-full bg-secondary" />
        <div className="h-5 w-24 rounded-full bg-secondary" />
      </div>
      <div className="mb-2 h-5 w-full rounded bg-secondary" />
      <div className="mb-1 h-4 w-2/3 rounded bg-secondary" />
      <div className="mt-3 h-7 w-32 rounded bg-secondary" />
    </div>
  );
}

export default function ZechubProposalsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ZechubProposalCardRow[]>([]);
  const [nextStartBefore, setNextStartBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const d = await fetchPage();
        if (!cancelled) {
          setItems(d.items);
          setNextStartBefore(d.nextStartBefore);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Load failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMore = useCallback(async () => {
    if (nextStartBefore == null) return;
    setLoadingMore(true);
    try {
      const d = await fetchPage(nextStartBefore);
      setItems((prev) => [...prev, ...d.items]);
      setNextStartBefore(d.nextStartBefore);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoadingMore(false);
    }
  }, [nextStartBefore]);

  const statusOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const row of items) {
      seen.add(row.proposal.status);
    }
    return [...seen].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [items]);

  const toggleStatus = (s: string) =>
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

  const filtered = useMemo(() => {
    let list = [...items];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((row) => row.proposal.title.toLowerCase().includes(q));
    }
    if (selectedStatuses.length > 0) {
      const set = new Set(selectedStatuses);
      list = list.filter((row) => set.has(row.proposal.status));
    }
    if (sortBy === "newest") {
      list.sort((a, b) => b.id - a.id);
    } else if (sortBy === "oldest") {
      list.sort((a, b) => a.id - b.id);
    } else if (sortBy === "title") {
      list.sort((a, b) =>
        a.proposal.title.localeCompare(b.proposal.title, undefined, {
          sensitivity: "base",
        })
      );
    }
    return list;
  }, [items, search, selectedStatuses, sortBy]);

  const goToPage = useCallback(
    (p: number) => {
      const nextQuery: Record<string, string | string[] | undefined> = {
        ...router.query,
      };
      if (p <= 1) delete nextQuery.page;
      else nextQuery.page = String(p);
      void router.replace(
        { pathname: "/zechub/proposals", query: nextQuery },
        undefined,
        { shallow: true }
      );
    },
    [router]
  );

  const filterSig = useMemo(
    () =>
      `${search}\0${[...selectedStatuses].sort().join()}\0${sortBy}`,
    [search, selectedStatuses, sortBy]
  );

  const filterSigRef = useRef<string | null>(null);
  useEffect(() => {
    if (!router.isReady) return;
    if (filterSigRef.current === null) {
      filterSigRef.current = filterSig;
      return;
    }
    if (filterSigRef.current === filterSig) return;
    filterSigRef.current = filterSig;
    if (!router.query.page) return;
    const nextQuery = { ...router.query };
    delete nextQuery.page;
    void router.replace(
      { pathname: "/zechub/proposals", query: nextQuery },
      undefined,
      { shallow: true }
    );
  }, [filterSig, router]);

  const totalPages = totalPagesForCount(filtered.length);
  const requestedPage = router.isReady ? parsePageQuery(router.query.page) : 1;
  const currentPage = Math.min(requestedPage, totalPages);

  useEffect(() => {
    if (!router.isReady) return;
    if (requestedPage > totalPages && totalPages >= 1) {
      const nextQuery = { ...router.query };
      delete nextQuery.page;
      void router.replace(
        { pathname: "/zechub/proposals", query: nextQuery },
        undefined,
        { shallow: true }
      );
    }
  }, [router.isReady, requestedPage, totalPages, router]);

  useEffect(() => {
    if (!router.isReady) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [router.query.page, router.isReady]);

  const paginatedProposals = useMemo(() => {
    const start = (currentPage - 1) * LIST_PAGE_SIZE;
    return filtered.slice(start, start + LIST_PAGE_SIZE);
  }, [filtered, currentPage]);

  const rangeStart =
    filtered.length === 0 ? 0 : (currentPage - 1) * LIST_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * LIST_PAGE_SIZE, filtered.length);

  const activeFilterCount = selectedStatuses.length;

  const FilterPanel = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Proposal status</h3>
        {statusOptions.length === 0 && !loading ? (
          <p className="text-xs text-muted-foreground">No statuses yet.</p>
        ) : (
          <div className="space-y-2">
            {statusOptions.map((s) => (
              <label
                key={s}
                className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <Checkbox
                  checked={selectedStatuses.includes(s)}
                  onCheckedChange={() => toggleStatus(s)}
                />
                <span className="truncate">{s}</span>
              </label>
            ))}
          </div>
        )}
      </div>
      {selectedStatuses.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedStatuses([])}
          className="text-muted-foreground"
        >
          <X className="mr-1 h-3 w-3" /> Clear status filters
        </Button>
      )}
    </div>
  );

  const daoUrl = zechubDaoDaodaoUrl();

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-5 sm:mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">ZecHub DAO proposals</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          Mini-grants and governance on DAO DAO (Juno)—independent from ZCG committee review. See{" "}
          <a
            href="https://zechub.wiki/dao"
            className="text-primary underline-offset-2 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            zechub.wiki/dao
          </a>{" "}
          for context.
        </p>
        <div className="mt-3">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href={daoUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open ZecHub on DAO DAO
            </a>
          </Button>
        </div>
      </div>

      <div className="flex gap-6 lg:gap-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search proposals…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-secondary pl-9"
              />
            </div>
            <FilterPanel />
          </div>
        </aside>

        <div className="flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {loading
                ? "Loading proposals from indexer…"
                : filtered.length === 0
                  ? `0 matching · ${items.length} loaded from indexer`
                  : `Rows ${rangeStart}–${rangeEnd} of ${filtered.length} matching · ${items.length} loaded from indexer`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="relative gap-2 lg:hidden"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px] bg-secondary sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest first</SelectItem>
                  <SelectItem value="oldest">Oldest first</SelectItem>
                  <SelectItem value="title">Title A–Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="relative mb-3 lg:hidden">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search proposals…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 bg-secondary pl-9"
            />
          </div>

          {showFilters && (
            <div className="mb-4 rounded-lg border border-border bg-card p-4 lg:hidden">
              <FilterPanel />
            </div>
          )}

          {loadError && (
            <Card className="mb-6 border-red-500/30 bg-red-500/5">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-400">Failed to load proposals</p>
                  <p className="mt-1 text-xs text-muted-foreground">{loadError}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {loading && (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProposalCardSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && (
            <div className="grid gap-4 sm:grid-cols-2">
              {paginatedProposals.map((row) => (
                <ZechubProposalCard key={row.id} row={row} />
              ))}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <ListPagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          )}

          {!loading && filtered.length === 0 && !loadError && (
            <div className="py-16 text-center sm:py-20">
              <p className="text-muted-foreground">No proposals match your filters.</p>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-primary"
                  onClick={() => setSelectedStatuses([])}
                >
                  <X className="mr-1 h-3 w-3" /> Clear filters
                </Button>
              )}
            </div>
          )}

          {nextStartBefore != null && !loading && (
            <div className="mt-8 flex justify-center">
              <Button
                variant="outline"
                disabled={loadingMore}
                onClick={() => void loadMore()}
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  "Load more from indexer"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
