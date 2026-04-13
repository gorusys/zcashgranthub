import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Head from "next/head";
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
import { useZechubDaoMeta } from "@/hooks/useZechubDaoMeta";

interface ListResponse {
  items: ZechubProposalCardRow[];
  nextStartBefore: number | null;
}

async function fetchPage(startBefore?: number): Promise<ListResponse> {
  const params = new URLSearchParams({ limit: String(LIST_PAGE_SIZE) });
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

function filterAndSortRows(
  rows: ZechubProposalCardRow[],
  search: string,
  selectedStatuses: string[],
  sortBy: string
): ZechubProposalCardRow[] {
  let list = [...rows];
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
  const { data: daoMeta } = useZechubDaoMeta();
  const [items, setItems] = useState<ZechubProposalCardRow[]>([]);
  const [nextStartBefore, setNextStartBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [pageFetching, setPageFetching] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    search.trim().length > 0 || selectedStatuses.length > 0;

  const filtered = useMemo(
    () => filterAndSortRows(items, search, selectedStatuses, sortBy),
    [items, search, selectedStatuses, sortBy]
  );

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

  const requestedPage = router.isReady ? parsePageQuery(router.query.page) : 1;

  /** Total pages: DAO on-chain count when unfiltered; otherwise from loaded + filtered rows. */
  const totalPages = useMemo(() => {
    if (hasActiveFilters) {
      return totalPagesForCount(filtered.length);
    }
    if (daoMeta && daoMeta.proposalCount > 0) {
      return totalPagesForCount(daoMeta.proposalCount);
    }
    return totalPagesForCount(items.length);
  }, [hasActiveFilters, filtered.length, daoMeta, items.length]);

  const currentPage = Math.min(requestedPage, totalPages);

  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!router.isReady) return;
    if (fetchingRef.current) return;

    const needed = currentPage * LIST_PAGE_SIZE;
    let rows = [...items];
    let cursor = nextStartBefore;

    const filteredNow = filterAndSortRows(rows, search, selectedStatuses, sortBy);
    if (filteredNow.length >= needed) {
      setLoading(false);
      setPageFetching(false);
      return;
    }
    if (rows.length > 0 && cursor === null) {
      setLoading(false);
      setPageFetching(false);
      return;
    }

    let cancelled = false;
    fetchingRef.current = true;

    (async () => {
      setLoadError(null);
      try {
        while (!cancelled) {
          const f = filterAndSortRows(rows, search, selectedStatuses, sortBy);
          if (f.length >= needed) break;
          if (rows.length > 0 && cursor === null) break;

          if (rows.length === 0) setLoading(true);
          else setPageFetching(true);

          const d = await fetchPage(rows.length === 0 ? undefined : cursor ?? undefined);
          if (cancelled) return;

          rows = [...rows, ...d.items];
          cursor = d.nextStartBefore;
          setItems(rows);
          setNextStartBefore(cursor);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Load failed");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setPageFetching(false);
        }
        fetchingRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      fetchingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- controlled sync: fetch when page/filters need more rows
  }, [
    router.isReady,
    currentPage,
    search,
    selectedStatuses,
    sortBy,
    items,
    nextStartBefore,
  ]);

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

  const summaryLine = useMemo(() => {
    if (loading) return "Loading proposals…";
    if (filtered.length === 0) return "No matching proposals";
    const totalLabel =
      hasActiveFilters || !daoMeta
        ? `${filtered.length} matching (from ${items.length} loaded)`
        : `${filtered.length} shown · ${daoMeta.proposalCount} on-chain total`;
    return `Showing ${rangeStart}–${rangeEnd} of ${filtered.length} · ${totalLabel}`;
  }, [
    loading,
    filtered.length,
    hasActiveFilters,
    daoMeta,
    items.length,
    rangeStart,
    rangeEnd,
  ]);

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <Head>
        <title>ZecHub DAO proposals · Zcash Grants Hub</title>
        <meta
          name="description"
          content="Browse on-chain ZecHub DAO proposals on Juno via DAO DAO—mini-grants and governance separate from ZCG GitHub review."
        />
      </Head>
      <div className="mb-5 sm:mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">ZecHub DAO proposals</h1>
        <p className="mt-1 text-sm text-muted-foreground sm:text-base">
          On-chain mini-grants and governance through{" "}
          <span className="font-medium text-foreground/90">DAO DAO</span> on{" "}
          <span className="font-medium text-foreground/90">Juno</span>—separate from ZCG committee
          review on GitHub. See{" "}
          <a
            href="https://zechub.wiki/dao"
            className="text-primary underline-offset-2 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            ZecHub DAO docs
          </a>{" "}
          for program context.
        </p>
        {daoMeta && (
          <div className="mt-4 flex flex-wrap gap-3 rounded-lg border border-border/50 bg-card/60 px-4 py-3 text-sm">
            <div>
              <span className="text-muted-foreground">DAO </span>
              <span className="font-medium text-foreground">{daoMeta.name}</span>
            </div>
            <span className="hidden text-border sm:inline">·</span>
            <div>
              <span className="text-muted-foreground">Chain </span>
              <span className="font-mono text-foreground">{daoMeta.chainId}</span>
            </div>
            <span className="hidden text-border sm:inline">·</span>
            <div>
              <span className="text-muted-foreground">Proposals (on-chain) </span>
              <span className="font-medium text-foreground">{daoMeta.proposalCount}</span>
            </div>
          </div>
        )}
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
              {summaryLine}
              {pageFetching && !loading && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-primary">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading page…
                </span>
              )}
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
            <div className="relative grid gap-4 sm:grid-cols-2">
              {pageFetching && (
                <div className="absolute inset-0 z-10 flex items-start justify-center rounded-lg bg-background/40 pt-8 backdrop-blur-[1px]">
                  <span className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Loading proposals…
                  </span>
                </div>
              )}
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
        </div>
      </div>
    </div>
  );
}
