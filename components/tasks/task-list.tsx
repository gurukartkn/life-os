import { TaskRow } from "@/components/tasks/task-row";
import type { Tables } from "@/lib/types/database";

// One card holding every row, divided by hairlines (Tasks board).
export function TaskList({
  tasks,
  onEdit,
}: {
  tasks: Tables<"tasks">[];
  onEdit: (task: Tables<"tasks">) => void;
}) {
  if (tasks.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-100">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} onEdit={onEdit} />
      ))}
    </div>
  );
}
