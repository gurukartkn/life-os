import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddTaskForm } from "./add-task-form";
import { createTask } from "@/actions/tasks";

vi.mock("@/actions/tasks", () => ({
  createTask: vi.fn(),
}));

const mockedCreateTask = vi.mocked(createTask);

describe("AddTaskForm", () => {
  beforeEach(() => {
    mockedCreateTask.mockReset();
  });

  it("submits the title and resets the field on success", async () => {
    mockedCreateTask.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<AddTaskForm />);

    const titleInput = screen.getByLabelText("Task title");
    await user.type(titleInput, "Buy groceries");
    await user.click(screen.getByRole("button", { name: /new task/i }));

    await waitFor(() => expect(mockedCreateTask).toHaveBeenCalled());
    const formData = mockedCreateTask.mock.calls[0][1];
    expect(formData.get("title")).toBe("Buy groceries");

    await waitFor(() => expect(titleInput).toHaveValue(""));
  });

  it("submits the date picked in the calendar as YYYY-MM-DD, including a past date", async () => {
    mockedCreateTask.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<AddTaskForm />);

    await user.type(screen.getByLabelText("Task title"), "Renew passport");
    await user.click(screen.getByRole("button", { name: "Due date" }));
    // Any month works: the calendar opens on the current month, and days from a
    // past month are reached with the previous-month button.
    await user.click(await screen.findByRole("button", { name: /Go to the Previous Month/i }));
    const days = await screen.findAllByRole("button", { name: /^\w+day, \w+ 1(st)?, \d{4}$/ });
    await user.click(days[0]);
    await user.click(screen.getByRole("button", { name: /new task/i }));

    await waitFor(() => expect(mockedCreateTask).toHaveBeenCalled());
    const formData = mockedCreateTask.mock.calls[0][1];
    expect(formData.get("due_date")).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it("sends no due_date when none is picked", async () => {
    mockedCreateTask.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<AddTaskForm />);

    await user.type(screen.getByLabelText("Task title"), "Buy milk");
    await user.click(screen.getByRole("button", { name: /new task/i }));

    await waitFor(() => expect(mockedCreateTask).toHaveBeenCalled());
    expect(mockedCreateTask.mock.calls[0][1].get("due_date")).toBeNull();
  });

  it("shows a client-side error and does not submit when the title is empty", async () => {
    const user = userEvent.setup();
    render(<AddTaskForm />);

    await user.click(screen.getByRole("button", { name: /new task/i }));

    expect(await screen.findByText("Enter a title.")).toBeInTheDocument();
    expect(mockedCreateTask).not.toHaveBeenCalled();
  });

  it("surfaces a server error returned by the action", async () => {
    mockedCreateTask.mockResolvedValue({
      success: false,
      error: "Couldn't add the task. Try again.",
    });
    const user = userEvent.setup();
    render(<AddTaskForm />);

    await user.type(screen.getByLabelText("Task title"), "Buy groceries");
    await user.click(screen.getByRole("button", { name: /new task/i }));

    expect(await screen.findByText("Couldn't add the task. Try again.")).toBeInTheDocument();
  });
});
