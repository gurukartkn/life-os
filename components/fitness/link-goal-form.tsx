"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { linkWorkoutLogToGoal, unlinkGoal } from "@/actions/links";
import { Button } from "@/components/ui/button";

export function LinkGoalForm({
  workoutLogId,
  goals,
  linkedGoal,
}: {
  workoutLogId: string;
  goals: Array<{ id: string; title: string }>;
  linkedGoal: { linkId: string; goalTitle: string } | null;
}) {
  const router = useRouter();
  const [goalId, setGoalId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLink() {
    if (!goalId) return;
    setError(null);
    startTransition(async () => {
      const result = await linkWorkoutLogToGoal({ workout_log_id: workoutLogId, goal_id: goalId });
      if (!result.success) {
        setError(result.error ?? "Couldn't link to the goal. Try again.");
        return;
      }
      router.refresh();
    });
  }

  function handleUnlink(linkId: string) {
    setError(null);
    startTransition(async () => {
      const result = await unlinkGoal(linkId, workoutLogId);
      if (!result.success) {
        setError(result.error ?? "Couldn't remove the link. Try again.");
        return;
      }
      router.refresh();
    });
  }

  if (goals.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      {linkedGoal ? (
        <div className="flex items-center gap-2 text-caption text-ink-muted">
          Linked to <span className="text-ink">{linkedGoal.goalTitle}</span>
          <button
            type="button"
            onClick={() => handleUnlink(linkedGoal.linkId)}
            disabled={isPending}
            className="text-pink-ink hover:underline disabled:pointer-events-none disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <select
            aria-label="Link to a goal"
            className="h-10 rounded-md border border-border-strong bg-surface-100 px-3 text-body-sm text-ink outline-none focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/30"
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
          >
            <option value="">Link to a goal…</option>
            {goals.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.title}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="outline"
            onClick={handleLink}
            disabled={isPending || !goalId}
          >
            Link
          </Button>
        </div>
      )}
      {error && <span className="text-caption text-pink-ink">{error}</span>}
    </div>
  );
}
