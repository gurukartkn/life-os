import { TodoRow } from "@/components/todos/todo-row";
import type { Tables } from "@/lib/types/database";

export function TodoList({ todos }: { todos: Tables<"todos">[] }) {
  return (
    <div className="flex flex-col gap-2">
      {todos.map((todo) => (
        <TodoRow key={todo.id} todo={todo} />
      ))}
    </div>
  );
}
