import Link from "next/link";
import { TodayCard, TodayCardNote, todayRowClassName } from "@/components/today/today-card";
import { formatClockTime } from "@/lib/dates";
import { sessionSummary } from "@/lib/fitness/labels";
import type { RecentSession } from "@/lib/queries/fitness";

// Today's Fitness card: the sessions logged today, each opening its log, and Workouts.
export function TodayFitnessCard({
  sessions,
  timeZone,
  loadError = false,
}: {
  sessions: RecentSession[];
  timeZone: string;
  loadError?: boolean;
}) {
  return (
    <TodayCard title="Fitness" slot="today-fitness" link={{ href: "/fitness/workouts", label: "Workouts" }}>
      {loadError ? (
        <TodayCardNote error>Couldn’t load workouts.</TodayCardNote>
      ) : sessions.length === 0 ? (
        <TodayCardNote>No workout logged today.</TodayCardNote>
      ) : (
        <ul>
          {sessions.map((session) => (
            <li key={session.id} className="border-t border-border">
              <Link href={`/fitness/logs/${session.id}`} className={todayRowClassName}>
                <div className="flex min-w-0 flex-1 flex-col gap-px">
                  <span className="truncate text-body font-medium text-ink">{session.workoutName}</span>
                  <span className="truncate text-caption text-ink-muted tabular-nums">
                    {formatClockTime(session.performedAt, timeZone)} · {sessionSummary(session.minutes, session.setCount)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </TodayCard>
  );
}
