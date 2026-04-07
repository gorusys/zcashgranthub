import { Check } from "lucide-react";
import { workflowSteps, getWorkflowStep, type GrantStatus } from "@/data/mockData";
import { cn } from "@/lib/utils";

export function WorkflowStepper({ status }: { status: GrantStatus }) {
  const current = getWorkflowStep(status);

  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {workflowSteps.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                i < current
                  ? "bg-primary text-primary-foreground"
                  : i === current
                  ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              {i < current ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span
              className={cn(
                "whitespace-nowrap text-[10px] font-medium",
                i <= current ? "text-primary" : "text-muted-foreground"
              )}
            >
              {step}
            </span>
          </div>
          {i < workflowSteps.length - 1 && (
            <div
              className={cn(
                "mx-1 h-0.5 w-8 shrink-0 lg:w-16",
                i < current ? "bg-primary" : "bg-secondary"
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
