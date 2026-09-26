import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { format, subDays } from "date-fns";
import TasksPage from "./page";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/dates";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/actions/tasks", () => ({ createTask: vi.fn(), updateTask: vi.fn(), toggleTask: vi.fn(), deleteTask: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(), useRouter: () => ({ refresh: vi.fn() }) }));

const mockedCreateClient = vi.mocked(createClient);
let supabase: SupabaseMock;

beforeEach(() => {
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

function task(overrides: Record<string, unknown>) {
  return {
    user_id: "user-1",
    description: null,
    completed_at: null,
    created_at: "2026-09-17T00:00:00.000Z",
    updated_at: "2026-09-17T00:00:00.000Z",
    ...overrides,
  };
}

describe("TasksPage", () => {
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  it("lists open tasks with overdue flagged, and a completed task dated yesterday not flagged", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder(
        queryResult([
          task({ id: "t1", title: "Renew passport", is_completed: false, due_date: yesterday }),
          task({ id: "t3", title: "Call the bank", is_completed: false, due_date: todayIso() }),
          task({ id: "t2", title: "Pay rent", is_completed: true, due_date: yesterday }),
        ])
      )
    );

    render(await TasksPage());

    expect(supabase.from).toHaveBeenCalledWith("tasks");
    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(screen.getAllByText(/^Overdue · /)).toHaveLength(1);
    expect(within(screen.getByText("Renew passport").closest('[data-slot="task-row"]')!).getByText(/^Overdue · /)).toBeInTheDocument();
    expect(within(screen.getByText("Call the bank").closest('[data-slot="task-row"]')!).getByText("Today")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All 3" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Active 2" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Completed 1" })).toBeInTheDocument();
  });

  it("shows the empty state with no tasks", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult([])));

    render(await TasksPage());

    expect(screen.getByText("No tasks yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All 0" })).toBeInTheDocument();
  });

  it("shows the load-failed state when the query errors", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult(null, { message: "down" })));

    render(await TasksPage());

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t load tasks");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});