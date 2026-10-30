import { useUi } from "@/i18n/useUi";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/hooks/useWatchlist";
import type { Grant } from "@/data/grantTypes";

/** Follow a grant; changes show up under the bell. Stored only in this browser. */
export function WatchButton({ grant }: { grant: Pick<Grant, "id" | "title" | "status" | "lastUpdated"> }) {
  const { text: tx } = useUi();
  const { isWatched, toggle } = useWatchlist();
  const on = isWatched(grant.id);
  return (
    <Button
      variant={on ? "secondary" : "outline"}
      size="sm"
      className="shrink-0 gap-1.5"
      aria-pressed={on}
      title={tx(on ? "Stop watching" : "Get notified here when this grant changes (stored only in this browser)")}
      onClick={() => toggle(grant)}
    >
      {on ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      {tx(on ? "Watching" : "Watch")}
    </Button>
  );
}
