import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CatalogManager } from "./catalog-manager";

const ID_A = "5b6f3d40-1111-4a11-8b11-111111111111";
const ID_B = "5b6f3d40-2222-4a11-8b11-222222222222";
const NEW_ID = "5b6f3d40-3333-4a11-8b11-333333333333";

const ITEMS = [
  { id: ID_A, name: "Chest", isActive: true },
  { id: ID_B, name: "Old one", isActive: false },
];

function makeActions(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {}) {
  return {
    create: vi.fn(),
    rename: vi.fn(),
    archive: vi.fn(),
    restore: vi.fn(),
    remove: vi.fn(),
    ...overrides,
  };
}

describe("CatalogManager", () => {
  it("shows every item, an Archived tag for inactive ones, and adds a new one", async () => {
    const actions = makeActions({
      create: vi.fn().mockResolvedValue({ success: true, data: { id: NEW_ID, name: "Legs", isActive: true } }),
    });
    const user = userEvent.setup();
    render(<CatalogManager title="Muscle groups" items={ITEMS} actions={actions} />);

    expect(screen.getByText("Chest")).toBeInTheDocument();
    expect(screen.getByText("Old one")).toBeInTheDocument();
    expect(screen.getByText("Archived")).toBeInTheDocument();

    await user.type(screen.getByLabelText("New muscle groups"), "Legs");
    await user.click(screen.getByLabelText("Add muscle groups"));

    await waitFor(() => expect(actions.create).toHaveBeenCalledWith({ name: "Legs" }));
    expect(await screen.findByText("Legs")).toBeInTheDocument();
  });

  it("renames an item inline", async () => {
    const actions = makeActions({
      rename: vi.fn().mockResolvedValue({ success: true, data: { id: ID_A, name: "Upper chest", isActive: true } }),
    });
    const user = userEvent.setup();
    render(<CatalogManager title="Muscle groups" items={ITEMS} actions={actions} />);

    await user.click(screen.getByLabelText("Rename Chest"));
    const input = screen.getByLabelText("Rename Chest");
    await user.clear(input);
    await user.type(input, "Upper chest");
    await user.keyboard("{Enter}");

    await waitFor(() => expect(actions.rename).toHaveBeenCalledWith(ID_A, "Upper chest"));
    expect(await screen.findByText("Upper chest")).toBeInTheDocument();
  });

  it("re-sorts the list after a rename moves an item's alphabetical place", async () => {
    const actions = makeActions({
      // "Chest" -> "Zzz" belongs after "Old one" once renamed.
      rename: vi.fn().mockResolvedValue({ success: true, data: { id: ID_A, name: "Zzz", isActive: true } }),
    });
    const user = userEvent.setup();
    render(<CatalogManager title="Muscle groups" items={ITEMS} actions={actions} />);

    await user.click(screen.getByLabelText("Rename Chest"));
    await user.keyboard("{Enter}"); // Enter with the same text still runs the handler.

    await waitFor(() => expect(actions.rename).toHaveBeenCalled());
    const names = (await screen.findAllByText(/^(Zzz|Old one)$/)).map((el) => el.textContent);
    expect(names).toEqual(["Old one", "Zzz"]);
  });

  it("archives an active item and restores an archived one", async () => {
    const actions = makeActions({
      archive: vi.fn().mockResolvedValue({ success: true, data: { id: ID_A, name: "Chest", isActive: false } }),
      restore: vi.fn().mockResolvedValue({ success: true, data: { id: ID_B, name: "Old one", isActive: true } }),
    });
    const user = userEvent.setup();
    render(<CatalogManager title="Muscle groups" items={ITEMS} actions={actions} />);

    await user.click(screen.getByLabelText("Archive Chest"));
    await waitFor(() => expect(actions.archive).toHaveBeenCalledWith(ID_A));

    await user.click(screen.getByLabelText("Restore Old one"));
    await waitFor(() => expect(actions.restore).toHaveBeenCalledWith(ID_B));
  });

  it("deletes an item once nothing links to it", async () => {
    const actions = makeActions({ remove: vi.fn().mockResolvedValue({ success: true }) });
    const user = userEvent.setup();
    render(<CatalogManager title="Muscle groups" items={ITEMS} actions={actions} />);

    await user.click(screen.getByLabelText("Delete Chest"));

    await waitFor(() => expect(actions.remove).toHaveBeenCalledWith(ID_A));
    await waitFor(() => expect(screen.queryByText("Chest")).not.toBeInTheDocument());
  });

  it("shows the typed error and keeps the row when delete is blocked", async () => {
    const actions = makeActions({
      remove: vi.fn().mockResolvedValue({
        success: false,
        error: "Some exercises still use this muscle group. Archive it instead.",
        code: "in_use",
      }),
    });
    const user = userEvent.setup();
    render(<CatalogManager title="Muscle groups" items={ITEMS} actions={actions} />);

    await user.click(screen.getByLabelText("Delete Chest"));

    expect(
      await screen.findByText("Some exercises still use this muscle group. Archive it instead.")
    ).toBeInTheDocument();
    expect(screen.getByText("Chest")).toBeInTheDocument();
  });
});
