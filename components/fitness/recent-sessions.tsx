import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { formatRelativeTime } from "@/lib/dates";
import { sessionSummary } from "@/lib/fitness/labels";
import type { RecentSession } from "@/lib/queries/fitness";

// "Recent sessions" (Workouts board): 56px rows, each opening that session's log.
export function RecentSessions({ sessions }: { sessions: RecentSession[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-100">
      {sessions.map((session) => (
        <Link
          key={session.id}
          href={`/fitness/logs/${session.id}`}
          className="flex min-h-14 items-center gap-4 border-b border-border px-4 outline-none transition-colors last:border-b-0 hover:bg-surface-200 focus-visible:bg-surface-200"
        >
          <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{session.workoutName}</span>
          <span className="text-body-sm text-ink-muted">{formatRelativeTime(session.performedAt)}</span>
          <span className="hidden w-[120px] text-body-sm text-ink-muted tabular-nums sm:inline">
            {sessionSummary(session.minutes, session.setCount)}
          </span>
          <ChevronRight className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} />
        </Link>
      ))}
    </div>
  );
}
