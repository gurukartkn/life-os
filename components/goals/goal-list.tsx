import Link from "next/link";
import { ChevronRight, LinkIcon } from "lucide-react";
import { GoalStatusTag } from "@/components/goals/goal-status-tag";
import { formatGoalDate, goalDateLabel, isGoalOverdue } from "@/lib/goals";
import { plural } from "@/lib/fitness/labels";
import type { GoalWithCount } from "@/lib/queries/goals";
import { cn } from "@/lib/utils";

// The Goals table (5a · "Goals — populated"): Goal, Target date (with how long is left
// or when it was reached), Status and Linked, under a surface-200 header row. Each row
// opens the goal. Below `sm` the Target date and Linked columns fold under the title.
export function GoalList({ goals, today }: { goals: GoalWithCount[]; today: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-100">
      <div
        aria-hidden
        className="hidden h-9 items-center gap-3 border-b border-border bg-surface-200 px-4 text-label text-ink-muted sm:flex"
      >
        <span className="min-w-0 flex-1">Goal</span>
        <span className="w-[170px]">Target date</span>
        <span className="w-[110px]">Status</span>
        <span className="w-[90px]">Linked</span>
        <span className="w-4" />
      </div>
      <ul>
        {goals.map((goal) => {
          const label = goalDateLabel(goal, today);
          const overdue = isGoalOverdue(goal, today);
          const dateText = goal.targetDate ? formatGoalDate(goal.targetDate) : "No date";
          const secondary = label === "No date" ? null : label;
          const linked = plural(goal.linkedCount, "item");
          return (
            <li key={goal.id} className="border-b border-border last:border-b-0">
              <Link
                href={`/goals/${goal.id}`}
                data-slot="goal-row"
                className="flex min-h-[60px] items-center gap-3 px-4 py-2 outline-none transition-colors hover:bg-surface-050 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className={cn(
                      "truncate text-body font-medium",
                      goal.status === "dropped" ? "text-ink-muted" : "text-ink"
                    )}
                  >
                    {goal.title}
                  </span>
                  <span className="truncate text-caption text-ink-muted sm:hidden">
                    {[dateText, secondary, linked].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <div className="hidden w-[170px] flex-col sm:flex">
                  <span className="text-body-sm text-ink">{dateText}</span>
                  {secondary && (
                    <span className={cn("text-caption", overdue ? "font-medium text-pink-ink" : "text-ink-muted")}>
                      {secondary}
                    </span>
                  )}
                </div>
                <div className="sm:w-[110px]">
                  <GoalStatusTag status={goal.status} />
                </div>
                <div className="hidden w-[90px] items-center gap-1 text-body-sm text-ink-muted sm:flex">
                  <LinkIcon className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                  {linked}
                </div>
                <ChevronRight className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
