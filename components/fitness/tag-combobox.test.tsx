import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagCombobox, type TagCreateResult } from "./tag-combobox";
import type { CatalogItem } from "@/lib/fitness/catalog";

const ITEMS: CatalogItem[] = [
  { id: "back", name: "Back", isActive: true },
  { id: "biceps", name: "Biceps", isActive: true },
  { id: "chest", name: "Chest", isActive: true },
  { id: "old", name: "Obliques", isActive: false },
];

function Controlled({
  initial = [],
  onCreate = vi.fn(),
  onChange,
}: {
  initial?: string[];
  onCreate?: (name: string) => Promise<TagCreateResult>;
  onChange?: (ids: string[]) => void;
}) {
  const [ids, setIds] = useState(initial);
  return (
    <TagCombobox
      label="Muscle groups"
      items={ITEMS}
      selectedIds={ids}
      onChange={(next) => {
        setIds(next);
        onChange?.(next);
      }}
      onCreate={onCreate}
    />
  );
}

describe("TagCombobox", () => {
  it("shows chosen items as chips and removes one with its x", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Controlled initial={["back", "biceps"]} onChange={onChange} />);

    expect(screen.getByText("Back")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove Back" }));

    expect(onChange).toHaveBeenLastCalledWith(["biceps"]);
  });

  it("filters the active, unchosen items as you type and picks one", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Controlled initial={["back"]} onChange={onChange} />);

    await user.click(screen.getByRole("combobox", { name: "Muscle groups" }));
    const options = screen.getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Biceps", "Chest"]); // Back is chosen, Obliques archived

    await user.type(screen.getByRole("combobox"), "che");
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenLastCalledWith(["back", "chest"]);
  });

  it("offers Create for a new name and adds what comes back", async () => {
    const onCreate = vi.fn().mockResolvedValue({ success: true, item: { id: "lats", name: "Lats", isActive: true } });
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Controlled onCreate={onCreate} onChange={onChange} />);

    await user.type(screen.getByRole("combobox"), "Lats");
    expect(screen.getByRole("option", { name: /Create “Lats”/ })).toBeInTheDocument();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(onCreate).toHaveBeenCalledWith("Lats"));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(["lats"]));
    expect(screen.getByText("Lats")).toBeInTheDocument();
  });

  it("offers the existing item, not Create, for a name that exists ignoring case", async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(<Controlled onCreate={onCreate} />);

    await user.type(screen.getByRole("combobox"), "chest");

    expect(screen.getByText("“chest” already exists. Names are unique, ignoring case.")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Chest.*Select existing/ })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /Create/ })).not.toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("shows a create failure under the field", async () => {
    const onCreate = vi.fn().mockResolvedValue({ success: false, error: "Couldn't add that. Try again." });
    const user = userEvent.setup();
    render(<Controlled onCreate={onCreate} />);

    await user.type(screen.getByRole("combobox"), "Lats{Enter}");

    expect(await screen.findByText("Couldn't add that. Try again.")).toBeInTheDocument();
  });

  it("removes the last chip with Backspace in an empty field", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Controlled initial={["back", "biceps"]} onChange={onChange} />);

    await user.click(screen.getByRole("combobox"));
    await user.keyboard("{Backspace}");

    expect(onChange).toHaveBeenLastCalledWith(["back"]);
  });
});
