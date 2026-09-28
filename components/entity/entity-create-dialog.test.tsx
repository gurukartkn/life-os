import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { z } from "zod";
import { EntityCreateDialog } from "./entity-create-dialog";
import { notify } from "@/lib/toast";
import type { ActionResult } from "@/lib/types/action-result";

vi.mock("@/lib/toast", () => ({ notify: { created: vi.fn(), error: vi.fn() } }));

const schema = z.object({ name: z.string().min(1, "Enter a name.") });
const action = vi.fn<(prev: ActionResult, formData: FormData) => Promise<ActionResult>>();

function Harness({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <EntityCreateDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New thing"
      entityLabel="Thing"
      schema={schema}
      defaultValues={{ name: "" }}
      action={action}
      toFormData={(values) => {
        const formData = new FormData();
        formData.set("name", values.name);
        return formData;
      }}
    >
      {(form) => (
        <>
          <label htmlFor="name">Name</label>
          <input id="name" {...form.register("name")} />
          {form.formState.errors.name && <p>{form.formState.errors.name.message}</p>}
        </>
      )}
    </EntityCreateDialog>
  );
}

describe("EntityCreateDialog", () => {
  beforeEach(() => {
    action.mockReset();
    vi.mocked(notify.created).mockReset();
  });

  it("shows the title with Cancel and Create", () => {
    render(<Harness open onOpenChange={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "New thing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  it("shows a client-side field error and never calls the action", async () => {
    const user = userEvent.setup();
    render(<Harness open onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Enter a name.")).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
  });

  it("disables Create and says Creating… while the action runs", async () => {
    let resolve: (result: ActionResult) => void = () => {};
    action.mockReturnValue(new Promise((r) => (resolve = r)));
    const user = userEvent.setup();
    render(<Harness open onOpenChange={vi.fn()} />);

    await user.type(screen.getByLabelText("Name"), "Lamp");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByRole("button", { name: "Creating…" })).toBeDisabled();
    // Settle it: React holds later transitions until a pending async action finishes.
    resolve({ success: false });
    expect(await screen.findByRole("button", { name: "Create" })).toBeEnabled();
  });

  it("puts a server field error under its field, once, and stays open", async () => {
    action.mockResolvedValue({ success: false, error: "Name taken.", fieldErrors: { name: "Name taken." } });
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<Harness open onOpenChange={onOpenChange} />);

    await user.type(screen.getByLabelText("Name"), "Lamp");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByText("Name taken.")).toBeInTheDocument();
    expect(screen.getAllByText("Name taken.")).toHaveLength(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("shows a server error that belongs to no field as a form error", async () => {
    action.mockResolvedValue({ success: false, error: "Couldn't add it. Try again." });
    const user = userEvent.setup();
    render(<Harness open onOpenChange={vi.fn()} />);

    await user.type(screen.getByLabelText("Name"), "Lamp");
    await user.click(screen.getByRole("button", { name: "Create" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't add it. Try again.");
  });

  it("submits, toasts, closes, and starts empty when opened again", async () => {
    action.mockResolvedValue({ success: true });
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(<Harness open onOpenChange={onOpenChange} />);

    await user.type(screen.getByLabelText("Name"), "Lamp");
    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(action.mock.calls[0][1].get("name")).toBe("Lamp");
    expect(notify.created).toHaveBeenCalledWith("Thing");

    rerender(<Harness open={false} onOpenChange={onOpenChange} />);
    rerender(<Harness open onOpenChange={onOpenChange} />);
    expect(await screen.findByLabelText("Name")).toHaveValue("");
  });
});
