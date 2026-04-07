import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, X, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { GrantCard } from "@/components/GrantCard";
import { useGrants } from "@/hooks/useGrants";
import type { GrantStatus, GrantCategory } from "@/data/mockData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

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
    <div className="rounded-lg border border-border/50 bg-card p-5 animate-pulse">
      <div className="mb-3 flex gap-2">
        <div className="h-5 w-24 rounded-full bg-secondary" />
        <div className="h-5 w-20 rounded-full bg-secondary" />
      </div>
      <div className="mb-2 h-5 w-3/4 rounded bg-secondary" />
      <div className="mb-1 h-4 w-1/2 rounded bg-secondary" />
      <div className="mt-3 h-7 w-24 rounded bg-secondary" />
    </div>
  );
}

export default function GrantsPage() {
  const { data: grants = [], isLoading, isError, error } = useGrants();

  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<GrantStatus[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<GrantCategory[]>([]);
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

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
    if (sortBy === "newest")
      list.sort(
        (a, b) =>
          new Date(b.submittedDate).getTime() -
          new Date(a.submittedDate).getTime()
      );
    if (sortBy === "amount-desc") list.sort((a, b) => b.amount - a.amount);
    return list;
  }, [grants, search, selectedStatuses, selectedCategories, sortBy]);

  const FilterPanel = () => (
    <div className="space-y-6">
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
      {(selectedStatuses.length > 0 || selectedCategories.length > 0) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSelectedStatuses([]);
            setSelectedCategories([]);
          }}
          className="text-muted-foreground"
        >
          <X className="mr-1 h-3 w-3" /> Clear filters
        </Button>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Browse Grants</h1>
        <p className="mt-1 text-muted-foreground">
          Explore funded projects in the Zcash ecosystem
        </p>
      </div>

      <div className="flex gap-8">
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
                : `Showing ${filtered.length} of ${grants.length} grants`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden"
                onClick={() => setShowFilters(!showFilters)}
              >
                <SlidersHorizontal className="mr-2 h-4 w-4" /> Filters
              </Button>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px] bg-secondary">
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
          <div className="relative mb-4 lg:hidden">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search grants..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-secondary pl-9"
            />
          </div>

          {showFilters && (
            <div className="mb-6 rounded-lg border border-border bg-card p-4 lg:hidden">
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
              {filtered.map((grant) => (
                <GrantCard key={grant.id} grant={grant} />
              ))}
            </div>
          )}

          {!isLoading && filtered.length === 0 && !isError && (
            <div className="py-20 text-center text-muted-foreground">
              No grants match your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
