import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { currentRound, nextMilestone, phaseLabel, roundPhase } from "@/lib/retroRounds";

/** One-line link to /retro with the current round's phase; hidden when nothing is upcoming. */
export function RetroRoundNotice() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => setNow(Date.now()), []);
  if (now == null) return null;

  const round = currentRound(undefined, now);
  const milestone = round ? nextMilestone(round, now) : null;
  if (!round || !milestone) return null;

  const date = new Date(milestone.at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  return (
    <Link
      href="/retro"
      className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-foreground transition-colors hover:bg-primary/20 sm:text-sm"
    >
      <CalendarClock className="h-3.5 w-3.5 text-primary" />
      <span>
        Coinholder {round.label}: {phaseLabel[roundPhase(round, now)].toLowerCase()} ·{" "}
        {milestone.label.toLowerCase()} {date}
      </span>
    </Link>
  );
}
