import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagPicker } from "./tag-picker";

const MG_1 = "5b6f3d40-1111-4a11-8b11-111111111111";
const MG_2 = "5b6f3d40-2222-4a11-8b11-222222222222";
const NEW_ID = "5b6f3d40-3333-4a11-8b11-333333333333";

const ITEMS = [
  { id: MG_1, name: "Chest", isActive: true },
  { id: MG_2, name: "Back", isActive: true },
];

describe("TagPicker", () => {
  it("toggles a chip's selection through onChange", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <TagPicker label="Muscle groups" items={ITEMS} selectedIds={[MG_1]} onChange={onChange} onCreate={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: "Chest" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Back" })).toHaveAttribute("aria-pressed", "false");

    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(onChange).toHaveBeenCalledWith([MG_1, MG_2]);

    await user.click(screen.getByRole("button", { name: "Chest" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("creates a new item, selects it, and clears the input", async () => {
    const onChange = vi.fn();
    const onCreate = vi.fn().mockResolvedValue({
      success: true,
      item: { id: NEW_ID, name: "Shoulders", isActive: true },
    });
    const user = userEvent.setup();
    render(
      <TagPicker label="Muscle groups" items={ITEMS} selectedIds={[]} onChange={onChange} onCreate={onCreate} />
    );

    await user.type(screen.getByLabelText("New muscle groups"), "Shoulders");
    await user.click(screen.getByLabelText("Add muscle groups"));

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith("Shoulders"));
    expect(onChange).toHaveBeenCalledWith([NEW_ID]);
    expect(await screen.findByRole("button", { name: "Shoulders" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText("New muscle groups")).toHaveValue(""));
  });

  it("shows an error and does not change the selection when create fails", async () => {
    const onChange = vi.fn();
    const onCreate = vi.fn().mockResolvedValue({ success: false, error: "That name already exists." });
    const user = userEvent.setup();
    render(
      <TagPicker label="Muscle groups" items={ITEMS} selectedIds={[]} onChange={onChange} onCreate={onCreate} />
    );

    await user.type(screen.getByLabelText("New muscle groups"), "Chest");
    await user.click(screen.getByLabelText("Add muscle groups"));

    expect(await screen.findByText("That name already exists.")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
