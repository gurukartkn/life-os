"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { ArchiveRoutineItemButton } from "@/components/routines/archive-routine-item-button";
import { toggleRoutineItem } from "@/actions/routines";

export function RoutineItemRow({
  id,
  title,
  checked,
  periodStart,
  routineId,
}: {
  id: string;
  title: string;
  checked: boolean;
  periodStart: string;
  routineId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle(isChecking: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await toggleRoutineItem(id, periodStart, isChecking, routineId);
      if (!result.success) setError(result.error ?? "Couldn't update the item. Try again.");
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-border bg-surface-100 px-4 py-3",
        isPending && "opacity-60"
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={handleToggle}
        disabled={isPending}
        aria-label={checked ? "Mark as not done" : "Mark as done"}
      />
      <div className="flex flex-1 flex-col gap-0.5">
        <span className={`text-body ${checked ? "text-ink-faint line-through" : "text-ink"}`}>
          {title}
        </span>
        {error && <span className="text-caption text-pink-ink">{error}</span>}
      </div>
      <ArchiveRoutineItemButton id={id} routineId={routineId} />
    </div>
  );
}
