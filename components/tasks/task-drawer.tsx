"use client";

import { deleteTask, updateTask } from "@/actions/tasks";
import { EntityDrawer } from "@/components/entity/entity-drawer";
import { TaskDatePill } from "@/components/tasks/task-date-pill";
import { TaskFields, taskFormData } from "@/components/tasks/task-fields";
import { Tag } from "@/components/ui/tag";
import { taskFormSchema } from "@/lib/validations/tasks";
import type { Tables } from "@/lib/types/database";

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 first:pt-0 last:border-b-0">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="text-body text-ink">{children}</dd>
    </div>
  );
}

// A task's drawer (?view=task:<id>): status, due date and notes; Edit is the same
// title + due date form as Add; Delete removes it for good (the Recycle Bin is 8.3).
export function TaskDrawer({ task, open, onClose }: { task: Tables<"tasks">; open: boolean; onClose: () => void }) {
  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title={task.title}
      entityLabel="Task"
      edit={{
        title: "Edit task",
        schema: taskFormSchema,
        defaultValues: { title: task.title, due_date: task.due_date ?? "" },
        action: updateTask,
        toFormData: (values) => taskFormData(values, task.id),
        children: (form) => <TaskFields form={form} isCompleted={task.is_completed} />,
      }}
      onDelete={() => deleteTask(task.id)}
    >
      <dl className="flex flex-col">
        <Detail label="Status">
          {task.is_completed ? <Tag tone="teal">Done</Tag> : <Tag>Open</Tag>}
        </Detail>
        <Detail label="Due date">
          {task.due_date ? (
            <TaskDatePill dueDate={task.due_date} isCompleted={task.is_completed} />
          ) : (
            <span className="text-ink-muted">No date</span>
          )}
        </Detail>
        {task.description && (
          <Detail label="Notes">
            <span className="whitespace-pre-wrap">{task.description}</span>
          </Detail>
        )}
      </dl>
    </EntityDrawer>
  );
}
