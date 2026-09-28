import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmDialog } from "./confirm-dialog";
import { notify } from "@/lib/toast";
import type { ActionResult } from "@/lib/types/action-result";

vi.mock("@/lib/toast", () => ({ notify: { error: vi.fn() } }));

const onConfirm = vi.fn<() => Promise<ActionResult>>();

describe("ConfirmDialog", () => {
  beforeEach(() => {
    onConfirm.mockReset();
    vi.mocked(notify.error).mockReset();
  });

  it("asks to delete permanently, with a destructive Delete", () => {
    render(<ConfirmDialog open onOpenChange={vi.fn()} intent="permanent" onConfirm={onConfirm} />);

    expect(screen.getByRole("heading", { name: "Delete permanently?" })).toBeInTheDocument();
    expect(screen.getByText("This can't be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("bg-pink");
  });

  it("asks to move to the Recycle Bin for the trash intent", () => {
    render(<ConfirmDialog open onOpenChange={vi.fn()} intent="trash" onConfirm={onConfirm} />);

    expect(screen.getByRole("heading", { name: "Move to Recycle Bin?" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move to bin" })).toBeInTheDocument();
  });

  it("does nothing but close on Cancel", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ConfirmDialog open onOpenChange={onOpenChange} intent="permanent" onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows a pending state, then closes and reports success", async () => {
    let resolve: (result: ActionResult) => void = () => {};
    onConfirm.mockReturnValue(new Promise((r) => (resolve = r)));
    const onOpenChange = vi.fn();
    const onConfirmed = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog open onOpenChange={onOpenChange} intent="permanent" onConfirm={onConfirm} onConfirmed={onConfirmed} />
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(await screen.findByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();

    resolve({ success: true });
    await waitFor(() => expect(onConfirmed).toHaveBeenCalled());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("toasts the error and stays open when the action fails", async () => {
    onConfirm.mockResolvedValue({ success: false, error: "Couldn't delete the task. Try again." });
    const onOpenChange = vi.fn();
    const onConfirmed = vi.fn();
    const user = userEvent.setup();
    render(
      <ConfirmDialog open onOpenChange={onOpenChange} intent="permanent" onConfirm={onConfirm} onConfirmed={onConfirmed} />
    );

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => expect(notify.error).toHaveBeenCalledWith("Couldn't delete the task. Try again."));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onConfirmed).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
  });
});
