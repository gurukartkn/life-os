import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { format, subDays } from "date-fns";
import TasksPage from "./page";
import { createClient } from "@/lib/supabase/server";
import { todayIso } from "@/lib/dates";
import { makeQueryBuilder, makeSupabaseMock, queryResult, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/actions/tasks", () => ({ createTask: vi.fn(), toggleTask: vi.fn(), deleteTask: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));

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

// A stat card is a label <span> above a value <span>; "Completed" is also a filter tab (a link).
function statValue(label: string): string {
  const labelEl = screen.getAllByText(label).find((el) => el.tagName === "SPAN")!;
  return within(labelEl.closest("div")!).getByText(/^\d+$/).textContent ?? "";
}

describe("TasksPage", () => {
  const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

  it("counts an incomplete task due yesterday as overdue, and a completed one as not", async () => {
    supabase.from.mockReturnValueOnce(
      makeQueryBuilder(
        queryResult([
          task({ id: "t1", title: "Renew passport", is_completed: false, due_date: yesterday }),
          task({ id: "t2", title: "Pay rent", is_completed: true, due_date: yesterday }),
          task({ id: "t3", title: "Call the bank", is_completed: false, due_date: todayIso() }),
        ])
      )
    );

    render(await TasksPage());

    expect(supabase.from).toHaveBeenCalledWith("tasks");
    expect(screen.getByRole("heading", { name: "Tasks" })).toBeInTheDocument();
    expect(statValue("Overdue")).toBe("1");
    expect(statValue("Due today")).toBe("1");
    expect(statValue("Completed")).toBe("1");

    const dueLine = (title: string) => within(screen.getByText(title).parentElement!).getByText(/^Due /);
    expect(dueLine("Renew passport")).toHaveClass("text-pink-ink");
    expect(dueLine("Pay rent")).not.toHaveClass("text-pink-ink");
    expect(dueLine("Call the bank")).not.toHaveClass("text-pink-ink");
  });

  it("shows the empty state with no tasks", async () => {
    supabase.from.mockReturnValueOnce(makeQueryBuilder(queryResult([])));

    render(await TasksPage());

    expect(screen.getByText("Nothing on the list today.")).toBeInTheDocument();
    expect(statValue("Overdue")).toBe("0");
  });
});
