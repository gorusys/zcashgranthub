import { type GrantCategory, categoryConfig } from "@/data/mockData";
import { cn } from "@/lib/utils";

export function CategoryBadge({ category, className }: { category: GrantCategory; className?: string }) {
  const config = categoryConfig[category];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.color,
        className
      )}
    >
      {category}
    </span>
  );
}
