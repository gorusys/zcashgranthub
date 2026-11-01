import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Shared content width and responsive gutters for every interior page and state. */
export function PageLayout({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div data-page-layout className={cn("container mx-auto min-w-0 px-4 py-6 sm:py-8", className)} {...props} />;
}
