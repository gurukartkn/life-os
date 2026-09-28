import Link from "next/link";
import { TodayCard, TodayCardNote, todayRowClassName } from "@/components/today/today-card";
import { Tag } from "@/components/ui/tag";
import { formatShortDate } from "@/lib/dates";
import { viewHref } from "@/lib/entity-view";
import type { TodayTask } from "@/lib/queries/tasks";

// Today's Tasks card: open tasks due today or overdue (overdue first, tagged pink),
// "+N more" when the list is capped, and All tasks.
export function TodayTasksCard({
  tasks,
  total,
  today,
  loadError = false,
}: {
  tasks: TodayTask[];
  total: number;
  today: string;
  loadError?: boolean;
}) {
  return (
    <TodayCard title="Tasks" slot="today-tasks" link={{ href: "/tasks", label: "All tasks" }}>
      {loadError ? (
        <TodayCardNote error>Couldn’t load tasks.</TodayCardNote>
      ) : tasks.length === 0 ? (
        <TodayCardNote>Nothing due today.</TodayCardNote>
      ) : (
        <>
          <ul>
            {tasks.map((task) => {
              const overdue = task.dueDate < today;
              return (
                <li key={task.id} className="border-t border-border">
                  <Link href={viewHref("/tasks", "task", task.id)} className={todayRowClassName}>
                    <span className="min-w-0 flex-1 truncate text-body font-medium text-ink">{task.title}</span>
                    <Tag tone={overdue ? "pink" : "blue"}>
                      {overdue ? `Overdue · ${formatShortDate(task.dueDate)}` : "Today"}
                    </Tag>
                  </Link>
                </li>
              );
            })}
          </ul>
          {total > tasks.length && (
            <p className="text-caption text-ink-muted tabular-nums">+{total - tasks.length} more</p>
          )}
        </>
      )}
    </TodayCard>
  );
}
