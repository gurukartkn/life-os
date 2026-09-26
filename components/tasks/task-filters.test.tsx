import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TaskFilters } from "./task-filters";

const COUNTS = { all: 10, active: 7, completed: 3 };

describe("TaskFilters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  // Regression for backlog #7: tabs used to be full server navigations.
  it("selecting a tab updates the URL with pushState and does not navigate", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    render(<TaskFilters active="all" counts={COUNTS} />);

    const notPrevented = fireEvent.click(screen.getByRole("link", { name: /^Active/ }));

    expect(notPrevented).toBe(false); // default (a full navigation) was prevented
    expect(pushState).toHaveBeenCalledWith(null, "", "/tasks?status=active");
  });

  it("does not push a duplicate history entry for the tab already showing", () => {
    window.history.replaceState(null, "", "/tasks?status=active");
    const pushState = vi.spyOn(window.history, "pushState");
    render(<TaskFilters active="active" counts={COUNTS} />);

    fireEvent.click(screen.getByRole("link", { name: /^Active/ }));

    expect(pushState).not.toHaveBeenCalled();
  });

  it("leaves modified clicks alone so a tab can still open in a new tab", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    render(<TaskFilters active="all" counts={COUNTS} />);

    const notPrevented = fireEvent.click(screen.getByRole("link", { name: /^Completed/ }), {
      ctrlKey: true,
    });

    expect(notPrevented).toBe(true);
    expect(pushState).not.toHaveBeenCalled();
  });

  it("marks and underlines only the active tab", () => {
    render(<TaskFilters active="completed" counts={COUNTS} />);

    const completed = screen.getByRole("link", { name: /^Completed/ });
    expect(completed).toHaveAttribute("aria-current", "true");
    expect(completed).toHaveClass("border-accent", "text-accent-text");
    const all = screen.getByRole("link", { name: /^All/ });
    expect(all).not.toHaveAttribute("aria-current");
    expect(all).toHaveClass("border-transparent");
  });

  it("shows each tab's count", () => {
    render(<TaskFilters active="all" counts={COUNTS} />);

    expect(screen.getByRole("link", { name: "All 10" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Active 7" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Completed 3" })).toBeInTheDocument();
  });

  it("links to the right status query params", () => {
    render(<TaskFilters active="all" counts={COUNTS} />);

    expect(screen.getByRole("link", { name: /^All/ })).toHaveAttribute("href", "/tasks");
    expect(screen.getByRole("link", { name: /^Active/ })).toHaveAttribute("href", "/tasks?status=active");
    expect(screen.getByRole("link", { name: /^Completed/ })).toHaveAttribute("href", "/tasks?status=completed");
  });
});
