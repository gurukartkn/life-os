"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteWorkout } from "@/actions/workouts";

export function DeleteWorkoutButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteWorkout(id);
      if (!result.success) setError(result.error ?? "Couldn't delete the workout. Try again.");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        aria-label="Delete workout"
        className="text-ink-faint transition-colors hover:text-pink-ink disabled:pointer-events-none disabled:opacity-50"
      >
        <Trash2 className="size-4" />
      </button>
      {error && <span className="text-caption text-pink-ink">{error}</span>}
    </div>
  );
}
