import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddTodoForm } from "./add-todo-form";
import { createTodo } from "@/actions/todos";

vi.mock("@/actions/todos", () => ({
  createTodo: vi.fn(),
}));

const mockedCreateTodo = vi.mocked(createTodo);

describe("AddTodoForm", () => {
  beforeEach(() => {
    mockedCreateTodo.mockReset();
  });

  it("submits the title and resets the field on success", async () => {
    mockedCreateTodo.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<AddTodoForm />);

    const titleInput = screen.getByLabelText("Todo title");
    await user.type(titleInput, "Buy groceries");
    await user.click(screen.getByRole("button", { name: /add todo/i }));

    await waitFor(() => expect(mockedCreateTodo).toHaveBeenCalled());
    const formData = mockedCreateTodo.mock.calls[0][1];
    expect(formData.get("title")).toBe("Buy groceries");

    await waitFor(() => expect(titleInput).toHaveValue(""));
  });

  it("shows a client-side error and does not submit when the title is empty", async () => {
    const user = userEvent.setup();
    render(<AddTodoForm />);

    await user.click(screen.getByRole("button", { name: /add todo/i }));

    expect(await screen.findByText("Enter a title.")).toBeInTheDocument();
    expect(mockedCreateTodo).not.toHaveBeenCalled();
  });

  it("surfaces a server error returned by the action", async () => {
    mockedCreateTodo.mockResolvedValue({
      success: false,
      error: "Couldn't add the todo. Try again.",
    });
    const user = userEvent.setup();
    render(<AddTodoForm />);

    await user.type(screen.getByLabelText("Todo title"), "Buy groceries");
    await user.click(screen.getByRole("button", { name: /add todo/i }));

    expect(await screen.findByText("Couldn't add the todo. Try again.")).toBeInTheDocument();
  });
});
