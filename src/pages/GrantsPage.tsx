import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { Search, SlidersHorizontal, X, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { GrantCard } from "@/components/GrantCard";
import { useGrants } from "@/hooks/useGrants";
import type { GrantStatus, GrantCategory } from "@/data/grantTypes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  ListPagination,
  LIST_PAGE_SIZE,
  parsePageQuery,
  totalPagesForCount,
} from "@/components/ListPagination";
import { programLabel, type GrantProgram } from "@/lib/grantPrograms";

const STATUSES: GrantStatus[] = [
  "PENDING_REVIEW",
  "COMMUNITY_REVIEW",
  "COMMITTEE_REVIEW",
  "APPROVED",
  "ACTIVE",
  "COMPLETED",
  "REJECTED",
];

const CATEGORIES: GrantCategory[] = [
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
  "Event Sponsorships",
];

function GrantCardSkeleton() {
  return (
    <div className="flex h-full min-w-0 flex-col rounded-lg border border-border/50 bg-card p-5 animate-pulse">
      <div className="mb-3 flex gap-2">
        <div className="h-5 w-24 rounded-full bg-secondary" />
        <div className="h-5 w-20 rounded-full bg-secondary" />
      </div>
      <div className="mb-2 h-5 w-3/4 rounded bg-secondary" />
      <div className="mb-1 h-4 w-1/2 rounded bg-secondary" />
      <div className="mb-3 h-7 w-24 rounded bg-secondary" />
      <div className="mt-auto flex justify-between border-t border-border/40 pt-3">
        <div className="h-3 w-20 rounded bg-secondary" />
        <div className="h-3 w-16 rounded bg-secondary" />
      </div>
    </div>
  );
}

export default function GrantsPage() {
  const router = useRouter();
  const { data: grants = [], isLoading, isError, error } = useGrants();

  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<GrantStatus[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<GrantCategory[]>([]);
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [programFilter, setProgramFilter] = useState<"all" | GrantProgram>("all");

  useEffect(() => {
    if (!router.isReady) return;
    const p = router.query.program;
    if (p === "zcg" || p === "coinholder") {
      setProgramFilter(p);
    } else if (p === undefined || p === "") {
      setProgramFilter("all");
    }
  }, [router.isReady, router.query.program]);

  const setProgramFilterAndUrl = useCallback(
    (v: "all" | GrantProgram) => {
      setProgramFilter(v);
      const nextQuery: Record<string, string | string[] | undefined> = {
        ...router.query,
      };
      if (v === "all") {
        delete nextQuery.program;
      } else {
        nextQuery.program = v;
      }
      delete nextQuery.page;
      void router.replace({ pathname: "/grants", query: nextQuery }, undefined, {
        shallow: true,
      });
    },
    [router]
  );

  const goToPage = useCallback(
    (p: number) => {
      const nextQuery: Record<string, string | string[] | undefined> = {
        ...router.query,
      };
      if (p <= 1) delete nextQuery.page;
      else nextQuery.page = String(p);
      void router.replace({ pathname: "/grants", query: nextQuery }, undefined, {
        shallow: true,
      });
    },
    [router]
  );

  const toggleStatus = (s: GrantStatus) =>
    setSelectedStatuses((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  const toggleCategory = (c: GrantCategory) =>
    setSelectedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  const filtered = useMemo(() => {
    let list = [...grants];
    if (search)
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(search.toLowerCase()) ||
          g.applicant.toLowerCase().includes(search.toLowerCase())
      );
    if (selectedStatuses.length)
      list = list.filter((g) => selectedStatuses.includes(g.status));
    if (selectedCategories.length)
      list = list.filter((g) => selectedCategories.includes(g.category));
    if (programFilter !== "all")
      list = list.filter((g) => g.program === programFilter);
    if (sortBy === "newest")
      list.sort(
        (a, b) =>
          new Date(b.submittedDate).getTime() -
          new Date(a.submittedDate).getTime()
      );
    if (sortBy === "amount-desc") list.sort((a, b) => b.amount - a.amount);
    return list;
  }, [grants, search, selectedStatuses, selectedCategories, programFilter, sortBy]);

  const filterSig = useMemo(
    () =>
      `${search}\0${[...selectedStatuses].sort().join()}\0${[...selectedCategories].sort().join()}\0${programFilter}\0${sortBy}`,
    [search, selectedStatuses, selectedCategories, programFilter, sortBy]
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
    void router.replace({ pathname: "/grants", query: nextQuery }, undefined, {
      shallow: true,
    });
  }, [filterSig, router]);

  const totalPages = totalPagesForCount(filtered.length);
  const requestedPage = router.isReady ? parsePageQuery(router.query.page) : 1;
  const currentPage = Math.min(requestedPage, totalPages);

  useEffect(() => {
    if (!router.isReady) return;
    if (requestedPage > totalPages && totalPages >= 1) {
      const nextQuery = { ...router.query };
      delete nextQuery.page;
      void router.replace({ pathname: "/grants", query: nextQuery }, undefined, {
        shallow: true,
      });
    }
  }, [router.isReady, requestedPage, totalPages, router]);

  useEffect(() => {
    if (!router.isReady) return;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [router.query.page, router.isReady]);

  const paginatedGrants = useMemo(() => {
    const start = (currentPage - 1) * LIST_PAGE_SIZE;
    return filtered.slice(start, start + LIST_PAGE_SIZE);
  }, [filtered, currentPage]);

  const rangeStart =
    filtered.length === 0 ? 0 : (currentPage - 1) * LIST_PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * LIST_PAGE_SIZE, filtered.length);

  const FilterPanel = () => (
    <div className="space-y-6">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Program</h3>
        <Select
          value={programFilter}
          onValueChange={(v) => setProgramFilterAndUrl(v as "all" | GrantProgram)}
        >
          <SelectTrigger className="bg-secondary">
            <SelectValue placeholder="Program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All programs</SelectItem>
            <SelectItem value="zcg">{programLabel("zcg")}</SelectItem>
            <SelectItem value="coinholder">{programLabel("coinholder")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Status</h3>
        <div className="space-y-2">
          {STATUSES.map((s) => (
            <label
              key={s}
              className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Checkbox
                checked={selectedStatuses.includes(s)}
                onCheckedChange={() => toggleStatus(s)}
              />
              {s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
            </label>
          ))}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Category</h3>
        <div className="space-y-2">
          {CATEGORIES.map((c) => (
            <label
              key={c}
              className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <Checkbox
                checked={selectedCategories.includes(c)}
                onCheckedChange={() => toggleCategory(c)}
              />
              {c}
            </label>
          ))}
        </div>
      </div>
      {(selectedStatuses.length > 0 ||
        selectedCategories.length > 0 ||
        programFilter !== "all") && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedStatuses([]);
            setSelectedCategories([]);
            setProgramFilterAndUrl("all");
          }}
          className="text-muted-foreground"
        >
          <X className="mr-1 h-3 w-3" /> Clear filters
        </Button>
      )}
    </div>
  );

  const activeFilterCount =
    selectedStatuses.length +
    selectedCategories.length +
    (programFilter !== "all" ? 1 : 0);

  const pageTitle =
    programFilter === "zcg"
      ? "ZCG grants"
      : programFilter === "coinholder"
        ? "Coinholder grants"
        : "Browse grants";

  const applyHref =
    programFilter === "coinholder" ? "/apply?tab=coinholder" : "/apply";

  const applyLabel =
    programFilter === "coinholder" ? "Apply for Coinholder grant" : "Apply for ZCG grant";

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <div className="mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{pageTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {programFilter === "zcg" && (
              <>
                Zcash Community Grants applications from GitHub.
              </>
            )}
            {programFilter === "coinholder" && (
              <>
                Financial Privacy Foundation coinholder program applications from GitHub.
              </>
            )}
            {programFilter === "all" && (
              <>
                ZCG and Coinholder grant applications from GitHub (composite ids such as{" "}
                <code className="rounded bg-secondary px-1 text-xs">zcg-42</code>
                ).
              </>
            )}
          </p>
        </div>
        <Button onClick={() => void router.push(applyHref)}>{applyLabel}</Button>
      </div>

      <div className="flex gap-6 lg:gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24">
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search grants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-secondary pl-9"
              />
            </div>
            <FilterPanel />
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading grants from GitHub…"
                : filtered.length === 0
                  ? `0 matching · ${grants.length} loaded from GitHub`
                  : `Rows ${rangeStart}–${rangeEnd} of ${filtered.length} matching · ${grants.length} loaded from GitHub`}
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
                <SelectTrigger className="w-[160px] bg-secondary sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="amount-desc">Amount: High to Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mobile search */}
          <div className="relative mb-3 lg:hidden">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search grants..."
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

          {/* Error state */}
          {isError && (
            <Card className="mb-6 border-red-500/30 bg-red-500/5">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
                <div>
                  <p className="text-sm font-medium text-red-400">
                    Failed to load grants
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(error as Error)?.message ||
                      "Could not fetch from GitHub API. Try again later."}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading skeleton */}
          {isLoading && (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <GrantCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && (
            <div className="grid gap-4 sm:grid-cols-2">
              {paginatedGrants.map((grant) => (
                <GrantCard key={grant.id} grant={grant} />
              ))}
            </div>
          )}

          {!isLoading && filtered.length > 0 && (
            <ListPagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
            />
          )}

          {!isLoading && filtered.length === 0 && !isError && (
            <div className="py-16 text-center sm:py-20">
              <p className="text-muted-foreground">No grants match your filters.</p>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-primary"
                  onClick={() => {
                    setSelectedStatuses([]);
                    setSelectedCategories([]);
                    setProgramFilterAndUrl("all");
                  }}
                >
                  <X className="mr-1 h-3 w-3" /> Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
