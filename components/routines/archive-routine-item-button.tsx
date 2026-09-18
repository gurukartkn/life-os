"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { archiveRoutineItem } from "@/actions/routines";

export function ArchiveRoutineItemButton({ id, routineId }: { id: string; routineId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleArchive() {
    setError(null);
    startTransition(async () => {
      const result = await archiveRoutineItem(id, routineId);
      if (!result.success) setError(result.error ?? "Couldn't remove the item. Try again.");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleArchive}
        disabled={isPending}
        aria-label="Remove item"
        className="rounded-sm text-ink-faint outline-none transition-colors hover:text-pink-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50"
      >
        <X className="size-4" />
      </button>
      {error && <span className="text-caption text-pink-ink">{error}</span>}
    </div>
  );
}
