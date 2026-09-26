import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CatalogManager, type CatalogActions } from "./catalog-manager";
import type { CatalogItem } from "@/lib/fitness/catalog";

const COPY = { title: "Muscle Groups", singular: "muscle group", emptyDescription: "Add muscle groups to tag your exercises." };

const CHEST: CatalogItem = { id: "mg-chest", name: "Chest", isActive: true };
const GLUTES: CatalogItem = { id: "mg-glutes", name: "Glutes", isActive: true };
const CALVES: CatalogItem = { id: "mg-calves", name: "Calves", isActive: false };

let actions: { [K in keyof CatalogActions]: ReturnType<typeof vi.fn> };

function renderManager(items: CatalogItem[] = [CHEST, GLUTES, CALVES], usage: Record<string, number> = { "mg-chest": 4 }) {
  return render(<CatalogManager copy={COPY} items={items} usage={usage} actions={actions as unknown as CatalogActions} />);
}

function row(name: string) {
  return screen.getByText(name).closest('[data-slot="catalog-row"]') as HTMLElement;
}

beforeEach(() => {
  actions = { create: vi.fn(), rename: vi.fn(), archive: vi.fn(), restore: vi.fn(), remove: vi.fn() };
});

describe("CatalogManager", () => {
  it("lists active items with how many exercises use them, archived ones folded away", async () => {
    const user = userEvent.setup();
    renderManager();

    expect(screen.getByRole("heading", { name: "Muscle Groups" })).toBeInTheDocument();
    expect(within(row("Chest")).getByText("4 exercises")).toBeInTheDocument();
    expect(within(row("Glutes")).getByText("Not used")).toBeInTheDocument();
    expect(screen.queryByText("Calves")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Archived \(1\)/ }));
    expect(screen.getByText("Calves")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore Calves" })).toBeInTheDocument();
  });

  it("adds a new item from the add row", async () => {
    actions.create.mockResolvedValue({ success: true, data: { id: "mg-lats", name: "Lats", isActive: true } });
    const user = userEvent.setup();
    renderManager();

    await user.click(screen.getByRole("button", { name: "Add muscle group" }));
    await user.type(screen.getByLabelText("New muscle group"), "Lats");
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(actions.create).toHaveBeenCalledWith({ name: "Lats" }));
    expect(await screen.findByText("Lats")).toBeInTheDocument();
  });

  it("refuses a name that already exists, ignoring case, without calling the server", async () => {
    const user = userEvent.setup();
    renderManager();

    await user.click(screen.getByRole("button", { name: "Add muscle group" }));
    await user.type(screen.getByLabelText("New muscle group"), "chest");

    expect(screen.getByText("“chest” already exists. Names are unique, ignoring case.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    expect(actions.create).not.toHaveBeenCalled();
  });

  it("renames an item in place", async () => {
    actions.rename.mockResolvedValue({ success: true, data: { ...GLUTES, name: "Glute med" } });
    const user = userEvent.setup();
    renderManager();

    await user.click(screen.getByRole("button", { name: "Rename Glutes" }));
    const input = screen.getByRole("textbox", { name: "Rename Glutes" });
    await user.clear(input);
    await user.type(input, "Glute med");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(actions.rename).toHaveBeenCalledWith("mg-glutes", "Glute med"));
    expect(await screen.findByText("Glute med")).toBeInTheDocument();
  });

  it("blocks deleting an item exercises use, and offers Archive instead", async () => {
    actions.archive.mockResolvedValue({ success: true, data: { ...CHEST, isActive: false } });
    const user = userEvent.setup();
    renderManager();

    await user.click(screen.getByRole("button", { name: "Delete Chest" }));

    expect(actions.remove).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Can’t delete Chest: 4 exercises use it. Archive it to hide it from pickers instead."
    );
    await user.click(screen.getByRole("button", { name: "Archive instead" }));
    await waitFor(() => expect(actions.archive).toHaveBeenCalledWith("mg-chest"));
    expect(await screen.findByRole("button", { name: /Archived \(2\)/ })).toBeInTheDocument();
  });

  it("deletes an unused item", async () => {
    actions.remove.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    renderManager();

    await user.click(screen.getByRole("button", { name: "Delete Glutes" }));

    await waitFor(() => expect(actions.remove).toHaveBeenCalledWith("mg-glutes"));
    await waitFor(() => expect(screen.queryByText("Glutes")).not.toBeInTheDocument());
  });

  it("shows the blocked message when the server says the item is in use", async () => {
    actions.remove.mockResolvedValue({ success: false, code: "in_use", error: "In use" });
    const user = userEvent.setup();
    renderManager([GLUTES], {});

    await user.click(screen.getByRole("button", { name: "Delete Glutes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Can’t delete Glutes");
  });

  it("restores an archived item", async () => {
    actions.restore.mockResolvedValue({ success: true, data: { ...CALVES, isActive: true } });
    const user = userEvent.setup();
    renderManager();

    await user.click(screen.getByRole("button", { name: /Archived \(1\)/ }));
    await user.click(screen.getByRole("button", { name: "Restore Calves" }));

    await waitFor(() => expect(actions.restore).toHaveBeenCalledWith("mg-calves"));
    expect(await screen.findByRole("button", { name: "Rename Calves" })).toBeInTheDocument();
  });

  it("shows the empty state with its own Add button when there is nothing yet", () => {
    renderManager([], {});

    expect(screen.getByText("No muscle groups yet")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Add muscle group" })).toHaveLength(2);
  });
});
