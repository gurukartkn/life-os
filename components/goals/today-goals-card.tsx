import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { GoalStatusTag } from "@/components/goals/goal-status-tag";
import { buttonVariants } from "@/components/ui/button";
import { formatGoalDay } from "@/lib/goals";
import type { GoalWithCount } from "@/lib/queries/goals";
import { cn } from "@/lib/utils";

// Today's Goals card (Today dashboard board): up to three active goals, nearest target
// first — "Target 8 Nov · 5 linked" under each title, the Active tag — and All goals.
export function TodayGoalsCard({ goals, loadError = false }: { goals: GoalWithCount[]; loadError?: boolean }) {
  return (
    <section
      aria-label="Goals"
      data-slot="today-goals"
      className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface-100 p-4"
    >
      <h2 className="text-heading text-ink">Goals</h2>
      {loadError ? (
        <p role="alert" className="border-t border-border py-3 text-body-sm text-pink-ink">
          Couldn’t load goals.
        </p>
      ) : goals.length === 0 ? (
        <p className="border-t border-border py-3 text-body-sm text-ink-muted">No active goals.</p>
      ) : (
        <ul>
          {goals.map((goal) => (
            <li key={goal.id} className="border-t border-border">
              <Link
                href={`/goals/${goal.id}`}
                className="flex min-h-[52px] items-center gap-2 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-body font-medium text-ink">{goal.title}</span>
                  <span className="truncate text-caption text-ink-muted">
                    {goal.targetDate ? `Target ${formatGoalDay(goal.targetDate)}` : "No date"} · {goal.linkedCount}{" "}
                    linked
                  </span>
                </div>
                <GoalStatusTag status={goal.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href="/goals" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "self-start")}>
        All goals
        <ChevronRight strokeWidth={1.75} />
      </Link>
    </section>
  );
}
