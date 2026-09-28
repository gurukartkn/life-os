import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";
import { EntityDrawer } from "./entity-drawer";
import { notify } from "@/lib/toast";
import type { ActionResult } from "@/lib/types/action-result";

vi.mock("@/lib/toast", () => ({
  notify: { updated: vi.fn(), deleted: vi.fn(), trashed: vi.fn(), error: vi.fn() },
}));

const schema = z.object({ name: z.string().min(1, "Enter a name.") });
const action = vi.fn<(prev: ActionResult, formData: FormData) => Promise<ActionResult>>();
const onDelete = vi.fn<() => Promise<ActionResult>>();

function drawer(open: boolean, onClose: () => void) {
  return (
    <EntityDrawer
      open={open}
      onClose={onClose}
      title="Desk lamp"
      entityLabel="Thing"
      edit={{
        title: "Edit thing",
        schema,
        defaultValues: { name: "Desk lamp" },
        action,
        toFormData: (values) => {
          const formData = new FormData();
          formData.set("name", values.name);
          return formData;
        },
        children: (form) => (
          <>
            <label htmlFor="name">Name</label>
            <input id="name" {...form.register("name")} />
          </>
        ),
      }}
      onDelete={onDelete}
    >
      <p>Lamp details</p>
    </EntityDrawer>
  );
}

function renderDrawer() {
  const onClose = vi.fn();
  const { rerender } = render(drawer(true, onClose));
  return { onClose, rerender: (open: boolean) => rerender(drawer(open, onClose)) };
}

describe("EntityDrawer", () => {
  beforeEach(() => {
    action.mockReset();
    onDelete.mockReset();
    vi.mocked(notify.updated).mockReset();
    vi.mocked(notify.deleted).mockReset();
  });

  it("opens read-only on the item's details, with Edit and Delete", () => {
    renderDrawer();

    expect(screen.getByRole("heading", { name: "Desk lamp" })).toBeInTheDocument();
    expect(screen.getByText("Lamp details")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
  });

  it("goes read → edit → save → read, calling the action and toasting", async () => {
    action.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(screen.getByRole("heading", { name: "Edit thing" })).toBeInTheDocument();
    const name = screen.getByLabelText("Name");
    expect(name).toHaveValue("Desk lamp");

    await user.clear(name);
    await user.type(name, "Floor lamp");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Lamp details")).toBeInTheDocument();
    expect(action.mock.calls[0][1].get("name")).toBe("Floor lamp");
    expect(notify.updated).toHaveBeenCalledWith("Thing");
  });

  it("stays in the form with the server's message when saving fails", async () => {
    action.mockResolvedValue({ success: false, error: "Couldn't save it. Try again." });
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.type(screen.getByLabelText("Name"), " 2");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't save it. Try again.");
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("returns to read mode on Cancel without asking when nothing changed", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByText("Discard changes?")).not.toBeInTheDocument();
    expect(screen.getByText("Lamp details")).toBeInTheDocument();
  });

  it("asks before discarding on Cancel with unsaved edits; Keep editing keeps them", async () => {
    const user = userEvent.setup();
    renderDrawer();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.type(screen.getByLabelText("Name"), " 2");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(await screen.findByRole("heading", { name: "Discard changes?" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByLabelText("Name")).toHaveValue("Desk lamp 2");

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(await screen.findByRole("button", { name: "Discard" }));
    expect(await screen.findByText("Lamp details")).toBeInTheDocument();
  });

  it("asks before closing with unsaved edits, and closes once discarded", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDrawer();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.type(screen.getByLabelText("Name"), " 2");
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(await screen.findByRole("heading", { name: "Discard changes?" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes straight away when there are no unsaved edits", async () => {
    const user = userEvent.setup();
    const { onClose } = renderDrawer();

    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(onClose).toHaveBeenCalled();
  });

  // Back changes the URL, so the page closes the drawer (open → false) before it can
  // object; with unsaved edits it stays up, restores its URL and asks.
  it("holds on through the browser's Back with unsaved edits: the URL is put back and it asks", async () => {
    const pushState = vi.spyOn(window.history, "pushState").mockImplementation(() => {});
    const user = userEvent.setup();
    const { onClose, rerender } = renderDrawer();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    await user.type(screen.getByLabelText("Name"), " 2");
    act(() => rerender(false));

    expect(await screen.findByRole("heading", { name: "Discard changes?" })).toBeInTheDocument();
    expect(pushState).toHaveBeenCalled();
    expect(screen.getByLabelText("Name")).toHaveValue("Desk lamp 2");
    expect(onClose).not.toHaveBeenCalled();
    pushState.mockRestore();
  });

  it("lets the URL close it when nothing is unsaved", async () => {
    const { rerender } = renderDrawer();

    act(() => rerender(false));

    await waitFor(() => expect(screen.queryByText("Lamp details")).not.toBeInTheDocument());
    expect(screen.queryByText("Discard changes?")).not.toBeInTheDocument();
  });

  it("confirms Delete, then toasts and closes", async () => {
    onDelete.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const { onClose } = renderDrawer();

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("heading", { name: "Delete permanently?" })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    // The confirm dialog's own Delete (the drawer's is behind it).
    const buttons = screen.getAllByRole("button", { name: "Delete" });
    await user.click(buttons[buttons.length - 1]);

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onDelete).toHaveBeenCalled();
    expect(notify.deleted).toHaveBeenCalledWith("Thing");
  });
});
