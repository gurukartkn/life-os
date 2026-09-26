"use client";

import { useState, useTransition } from "react";
import { AlertCircle } from "lucide-react";
import { toggleRoutineItem } from "@/actions/routines";
import { Checkbox } from "@/components/ui/checkbox";
import { Tag } from "@/components/ui/tag";
import { cn } from "@/lib/utils";
import type { TodayItem } from "@/lib/queries/routines";

// One routine item on the Routines page. One tap checks it for today (tap again to
// undo); the tick shows at once and rolls back if the save fails. `early` is the Not
// due today list's compact form, which shows why the item isn't due instead.
export function RoutineCheckRow({ item, today, early = false }: { item: TodayItem; today: string; early?: boolean }) {
  const [checked, setChecked] = useState(item.checked);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setChecked(next);
    setError(null);
    startTransition(async () => {
      const result = await toggleRoutineItem(item.id, today, next);
      if (!result.success) {
        setChecked(!next);
        setError(result.error ?? "Couldn't update the item. Try again.");
      }
    });
  }

  return (
    <div
      data-slot="routine-check-row"
      className={cn("flex items-center gap-3.5 px-4", early ? "min-h-12" : "min-h-14 py-1.5", isPending && "opacity-70")}
    >
      <Checkbox
        className="size-[22px]"
        checked={checked}
        onCheckedChange={handleChange}
        aria-label={early ? `Check ${item.title} early` : `Check ${item.title}`}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <span className={cn("truncate text-body font-medium", checked ? "text-ink-muted line-through" : "text-ink")}>
          {item.title}
        </span>
        {!early && <span className="truncate text-caption text-ink-muted">{item.detail}</span>}
        {error && <span className="text-caption text-pink-ink">{error}</span>}
      </div>
      {early && item.notDueLabel && (
        <Tag>
          <AlertCircle strokeWidth={1.75} />
          {item.notDueLabel}
        </Tag>
      )}
      {!early && checked && item.doneAt && <span className="text-caption text-ink-muted">{item.doneAt}</span>}
    </div>
  );
}
