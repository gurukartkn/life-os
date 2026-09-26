import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { format, subDays } from "date-fns";
import { TaskFormDialog } from "./task-form-dialog";
import { createTask, deleteTask, updateTask } from "@/actions/tasks";
import type { Tables } from "@/lib/types/database";

vi.mock("@/actions/tasks", () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

const mockedCreate = vi.mocked(createTask);
const mockedUpdate = vi.mocked(updateTask);
const mockedDelete = vi.mocked(deleteTask);
const ID = "550e8400-e29b-41d4-a716-446655440000";

function makeTask(overrides: Partial<Tables<"tasks">> = {}): Tables<"tasks"> {
  return {
    id: ID,
    user_id: "user-1",
    title: "Order chain lube",
    description: null,
    is_completed: false,
    completed_at: null,
    due_date: null,
    created_at: "2026-09-17T00:00:00.000Z",
    updated_at: "2026-09-17T00:00:00.000Z",
    ...overrides,
  };
}

function renderDialog(task: Tables<"tasks"> | null = null) {
  const onOpenChange = vi.fn();
  render(<TaskFormDialog open task={task} onOpenChange={onOpenChange} />);
  return { onOpenChange, dialog: screen.getByRole("dialog") };
}

describe("TaskFormDialog — add", () => {
  beforeEach(() => {
    mockedCreate.mockReset();
  });

  it("submits the title and closes on success", async () => {
    mockedCreate.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const { onOpenChange, dialog } = renderDialog();

    expect(within(dialog).getByRole("heading", { name: "Add task" })).toBeInTheDocument();
    await user.type(within(dialog).getByLabelText("Title"), "Buy groceries");
    await user.click(within(dialog).getByRole("button", { name: "Add task" }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    const formData = mockedCreate.mock.calls[0][1];
    expect(formData.get("title")).toBe("Buy groceries");
    expect(formData.get("due_date")).toBeNull();
    expect(formData.get("id")).toBeNull();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("submits a past date picked in the calendar as YYYY-MM-DD, and flags it Overdue in the field", async () => {
    mockedCreate.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const { dialog } = renderDialog();

    await user.type(within(dialog).getByLabelText("Title"), "Renew passport");
    await user.click(within(dialog).getByRole("button", { name: "Due date" }));
    await user.click(await screen.findByRole("button", { name: /Go to the Previous Month/i }));
    const days = await screen.findAllByRole("button", { name: /^\w+day, \w+ 1(st)?, \d{4}$/ });
    await user.click(days[0]);

    expect(within(dialog).getByText("Overdue")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Add task" }));

    await waitFor(() => expect(mockedCreate).toHaveBeenCalled());
    expect(mockedCreate.mock.calls[0][1].get("due_date")).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it("shows a client-side error and does not submit when the title is empty", async () => {
    const user = userEvent.setup();
    const { dialog } = renderDialog();

    await user.click(within(dialog).getByRole("button", { name: "Add task" }));

    expect(await within(dialog).findByText("Enter a title.")).toBeInTheDocument();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("surfaces a server error and stays open", async () => {
    mockedCreate.mockResolvedValue({ success: false, error: "Couldn't add the task. Try again." });
    const user = userEvent.setup();
    const { onOpenChange, dialog } = renderDialog();

    await user.type(within(dialog).getByLabelText("Title"), "Buy groceries");
    await user.click(within(dialog).getByRole("button", { name: "Add task" }));

    expect(await within(dialog).findByText("Couldn't add the task. Try again.")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("offers no Delete when adding", () => {
    const { dialog } = renderDialog();
    expect(within(dialog).queryByRole("button", { name: "Delete task" })).not.toBeInTheDocument();
  });
});

describe("TaskFormDialog — edit", () => {
  beforeEach(() => {
    mockedUpdate.mockReset();
    mockedDelete.mockReset();
  });

  it("starts from the task's values and saves them with its id", async () => {
    mockedUpdate.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const { onOpenChange, dialog } = renderDialog(makeTask({ due_date: "2026-10-02" }));

    expect(within(dialog).getByRole("heading", { name: "Edit task" })).toBeInTheDocument();
    const title = within(dialog).getByLabelText("Title");
    expect(title).toHaveValue("Order chain lube");
    expect(within(dialog).getByRole("button", { name: "Due date, Fri 2 Oct 2026" })).toBeInTheDocument();

    await user.clear(title);
    await user.type(title, "Order chain lube (wax)");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalled());
    const formData = mockedUpdate.mock.calls[0][1];
    expect(formData.get("id")).toBe(ID);
    expect(formData.get("title")).toBe("Order chain lube (wax)");
    expect(formData.get("due_date")).toBe("2026-10-02");
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("clears the due date from the field's x", async () => {
    mockedUpdate.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const { dialog } = renderDialog(makeTask({ due_date: yesterday }));

    expect(within(dialog).getByText("Overdue")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Clear due date" }));
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mockedUpdate).toHaveBeenCalled());
    expect(mockedUpdate.mock.calls[0][1].get("due_date")).toBeNull();
  });

  it("deletes the task and closes", async () => {
    mockedDelete.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const { onOpenChange, dialog } = renderDialog(makeTask());

    await user.click(within(dialog).getByRole("button", { name: "Delete task" }));

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith(ID));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it("keeps the modal open with the message when delete fails", async () => {
    mockedDelete.mockResolvedValue({ success: false, error: "Couldn't delete the task. Try again." });
    const user = userEvent.setup();
    const { onOpenChange, dialog } = renderDialog(makeTask());

    await user.click(within(dialog).getByRole("button", { name: "Delete task" }));

    expect(await within(dialog).findByText("Couldn't delete the task. Try again.")).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
