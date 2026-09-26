"use client";

import { useCallback, useState } from "react";
import { CircleAlert, Plus, Target } from "lucide-react";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { GoalList } from "@/components/goals/goal-list";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { RetryButton } from "@/components/ui/retry-button";
import type { GoalWithCount } from "@/lib/queries/goals";

// The Goals screen (5a · Goals): header with New goal, then the goals table — or the
// empty / load-failed card. New goal opens the goal sheet; a row opens the goal.
export function GoalsView({
  goals,
  today,
  loadError = false,
}: {
  goals: GoalWithCount[];
  today: string;
  loadError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const openNew = useCallback(() => setOpen(true), []);

  const newButton = (
    <Button type="button" onClick={openNew}>
      <Plus strokeWidth={1.75} />
      New goal
    </Button>
  );

  let content: React.ReactNode;
  if (loadError) {
    content = (
      <EmptyState
        tone="error"
        icon={CircleAlert}
        title="Couldn’t load goals"
        description="Check your connection and try again."
        action={<RetryButton />}
      />
    );
  } else if (goals.length === 0) {
    content = (
      <EmptyState
        icon={Target}
        title="No goals yet"
        description="Set a goal, then link the tasks, routines and workouts that lead to it."
        action={newButton}
      />
    );
  } else {
    content = <GoalList goals={goals} today={today} />;
  }

  return (
    <div className="flex flex-col">
      <PageHeader title="Goals" actions={newButton} />
      {content}
      <GoalFormDialog open={open} goal={null} onOpenChange={setOpen} />
    </div>
  );
}
