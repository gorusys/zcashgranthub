import { type GrantStatus, statusConfig } from "@/data/grantTypes";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: GrantStatus; className?: string }) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        config.color,
        className
      )}
    >
      {config.dotColor && (
        <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse-dot", config.dotColor)} />
      )}
      {config.label}
    </span>
  );
}
