import { TaskRow } from "@/components/tasks/task-row";
import type { Tables } from "@/lib/types/database";

export function TaskList({ tasks }: { tasks: Tables<"tasks">[] }) {
  return (
    <div className="flex flex-col gap-2">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </div>
  );
}
