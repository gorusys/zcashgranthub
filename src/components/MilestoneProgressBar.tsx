import type { Milestone } from "@/data/grantTypes";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const milestoneStatusColor: Record<string, string> = {
  Paid: "bg-primary",
  Approved: "bg-emerald-500",
  Submitted: "bg-blue-500",
  "In Progress": "bg-amber-500",
  Pending: "bg-secondary",
};

export function MilestoneProgressBar({ milestones }: { milestones: Milestone[] }) {
  return (
    <div className="flex gap-1">
      {milestones.map((m) => (
        <Tooltip key={m.number}>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "h-2 flex-1 rounded-full transition-colors",
                milestoneStatusColor[m.status] || "bg-secondary"
              )}
            />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">
              Milestone {m.number}: {m.status} — ${m.amount.toLocaleString()}
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
