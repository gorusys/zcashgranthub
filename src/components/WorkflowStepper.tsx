import { Check } from "lucide-react";
import { workflowSteps, getWorkflowStep, type GrantStatus } from "@/data/grantTypes";
import { cn } from "@/lib/utils";

export function WorkflowStepper({ status }: { status: GrantStatus }) {
  const current = getWorkflowStep(status);
  const isTerminal = current === -1;

  return (
    <div className="scrollbar-hide w-full overflow-x-auto">
      <div className="flex min-w-max items-center px-1 py-1">
        {workflowSteps.map((step, i) => {
          const done    = !isTerminal && i < current;
          const active  = !isTerminal && i === current;
          const pending = isTerminal || i > current;

          return (
            <div key={step} className="flex items-center">
              {/* Step node */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 sm:h-8 sm:w-8",
                    done   && "bg-primary text-primary-foreground",
                    active && "bg-primary text-primary-foreground shadow-[0_0_0_3px_hsl(var(--background)),0_0_0_5px_hsl(var(--primary)/0.4)]",
                    pending && "bg-secondary text-muted-foreground"
                  )}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </div>
                <span
                  className={cn(
                    "whitespace-nowrap text-[9px] font-medium sm:text-[10px]",
                    (done || active) ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step}
                </span>
              </div>

              {/* Connector */}
              {i < workflowSteps.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-px w-6 shrink-0 transition-colors duration-200 sm:w-10 lg:w-14",
                    done ? "bg-primary" : "bg-secondary"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
