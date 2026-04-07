import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { CategoryBadge } from "@/components/CategoryBadge";
import type { Grant } from "@/data/mockData";

export function GrantCard({ grant }: { grant: Grant }) {
  const progressPercent = grant.totalMilestones > 0
    ? (grant.milestonesCompleted / grant.totalMilestones) * 100
    : 0;

  return (
    <Link to={`/grants/${grant.id}`}>
      <Card className="group border-border/50 bg-card transition-all duration-200 hover:border-primary/30 hover:glow-gold">
        <CardContent className="p-5">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={grant.status} />
              <CategoryBadge category={grant.category} />
            </div>
          </div>

          <h3 className="mb-2 line-clamp-2 text-base font-semibold text-foreground group-hover:text-primary transition-colors">
            {grant.title}
          </h3>

          <div className="mb-3 flex items-center gap-2">
            <img
              src={grant.applicantAvatar}
              alt={grant.applicant}
              className="h-5 w-5 rounded-full"
            />
            <span className="text-sm text-muted-foreground">{grant.applicant}</span>
          </div>

          <div className="mb-3 text-xl font-bold text-primary">
            ${grant.amount.toLocaleString()}
          </div>

          {grant.totalMilestones > 0 && (
            <div className="mb-3">
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>Milestones</span>
                <span>{grant.milestonesCompleted} of {grant.totalMilestones}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(grant.submittedDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
            <span className="flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              View Grant <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
