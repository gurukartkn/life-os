"use client";

import { useState } from "react";
import { CalendarDays, CircleAlert, Pencil } from "lucide-react";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { GoalStatusTag } from "@/components/goals/goal-status-tag";
import { LinkGroup } from "@/components/goals/link-group";
import { BackLink } from "@/components/ui/back-link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RetryButton } from "@/components/ui/retry-button";
import { formatGoalDate, goalDateLabel, isGoalOverdue } from "@/lib/goals";
import type { GoalDetail, LinkPicker } from "@/lib/queries/goals";
import { cn } from "@/lib/utils";

// The goal detail (5a · "Goal detail with link picker"): back to Goals, the title with
// Edit goal, the status, target date and how long is left (pink once an active goal is
// past its target), then the Tasks, Routines and Fitness items groups.
export function GoalDetailView({
  detail,
  picker,
  today,
  loadError = false,
}: {
  detail: GoalDetail;
  picker: LinkPicker;
  today: string;
  loadError?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const { goal, linked } = detail;
  const label = goalDateLabel(goal, today);
  const overdue = isGoalOverdue(goal, today);

  return (
    <div className="flex flex-col">
      <div className="mb-5 flex flex-col gap-2">
        <BackLink href="/goals">Goals</BackLink>
        <div className="flex items-center justify-between gap-2">
          <h1 className="min-w-0 text-page-title break-words text-ink">{goal.title}</h1>
          <Button type="button" variant="outline" className="shrink-0" onClick={() => setEditing(true)}>
            <Pencil strokeWidth={1.75} />
            Edit goal
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
          <GoalStatusTag status={goal.status} />
          <div className="flex items-center gap-1.5 text-body-sm">
            <CalendarDays className="size-3.5 text-ink-muted" strokeWidth={1.75} aria-hidden />
            {goal.targetDate ? (
              <span className="font-medium text-ink">{formatGoalDate(goal.targetDate)}</span>
            ) : null}
            {label && (
              <span data-slot="goal-date-label" className={overdue ? "font-medium text-pink-ink" : "text-ink-muted"}>
                {label}
              </span>
            )}
          </div>
        </div>
      </div>

      {loadError && (
        <EmptyState
          tone="error"
          icon={CircleAlert}
          title="Couldn’t load everything linked to this goal"
          description="Check your connection and try again."
          action={<RetryButton />}
          className="mb-4"
        />
      )}

      <div className={cn("grid grid-cols-1 gap-4 lg:grid-cols-3", loadError && "opacity-60")}>
        <LinkGroup
          goalId={goal.id}
          title="Tasks"
          types={["task"]}
          linked={linked.task}
          pickerItems={picker.task}
          today={today}
          searchLabel="Search tasks"
        />
        <LinkGroup
          goalId={goal.id}
          title="Routines"
          types={["routine"]}
          linked={linked.routine}
          pickerItems={picker.routine}
          today={today}
          searchLabel="Search routines"
        />
        <LinkGroup
          goalId={goal.id}
          title="Fitness items"
          types={["workout", "exercise"]}
          linked={[...linked.workout, ...linked.exercise]}
          pickerItems={[...picker.workout, ...picker.exercise]}
          today={today}
          searchLabel="Search workouts and exercises"
        />
      </div>

      <GoalFormDialog open={editing} goal={goal} onOpenChange={setEditing} afterDelete="/goals" />
    </div>
  );
}
