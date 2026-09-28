import Link from "next/link";
import { TodayCard, TodayCardNote, todayRowClassName } from "@/components/today/today-card";
import { Tag } from "@/components/ui/tag";
import type { RoutinesToday } from "@/lib/queries/routines";

// Today's Routines card: the day's done/due count, then each routine due today with
// its own progress (teal once every due item is checked), and Open routines.
export function TodayRoutinesCard({ routines, loadError = false }: { routines: RoutinesToday; loadError?: boolean }) {
  const due = routines.groups.flatMap((group) => group.routines);
  return (
    <TodayCard title="Routines" slot="today-routines" link={{ href: "/routines", label: "Open routines" }}>
      {loadError ? (
        <TodayCardNote error>Couldn’t load routines.</TodayCardNote>
      ) : !routines.hasRoutines ? (
        <TodayCardNote>No routines yet.</TodayCardNote>
      ) : due.length === 0 ? (
        <TodayCardNote>Nothing due today.</TodayCardNote>
      ) : (
        <>
          <p className="text-caption text-ink-muted tabular-nums">
            {routines.doneCount} of {routines.dueCount} done
          </p>
          <ul>
            {due.map((routine) => {
              const done = routine.items.filter((item) => item.checked).length;
              const complete = done === routine.items.length;
              return (
                <li key={routine.id} className="border-t border-border">
                  <Link href="/routines" className={todayRowClassName}>
                    <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{routine.title}</span>
                    <Tag tone={complete ? "teal" : "blue"} className="tabular-nums">
                      {done} of {routine.items.length}
                    </Tag>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </TodayCard>
  );
}
