import { beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "sonner";
import { notify } from "./toast";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("notify", () => {
  beforeEach(() => {
    vi.mocked(toast.success).mockReset();
    vi.mocked(toast.error).mockReset();
  });

  it("words each outcome in the past tense", () => {
    notify.created("Task");
    notify.updated("Task");
    notify.deleted("Task");
    notify.restored("Task");

    expect(vi.mocked(toast.success).mock.calls.map((call) => call[0])).toEqual([
      "Task created",
      "Task saved",
      "Task deleted",
      "Task restored",
    ]);
  });

  it("offers Undo on a trashed item only when given onUndo", () => {
    const onUndo = vi.fn();
    notify.trashed("Task", { onUndo });
    notify.trashed("Task");

    expect(toast.success).toHaveBeenNthCalledWith(1, "Task moved to Recycle Bin", {
      action: { label: "Undo", onClick: onUndo },
    });
    expect(toast.success).toHaveBeenNthCalledWith(2, "Task moved to Recycle Bin", { action: undefined });
  });

  it("shows errors as they are given", () => {
    notify.error("Couldn't save the task. Try again.");
    expect(toast.error).toHaveBeenCalledWith("Couldn't save the task. Try again.");
  });
});
