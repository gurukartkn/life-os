import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { TodoFilters } from "./todo-filters";

describe("TodoFilters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  // Regression for backlog #7: tabs used to be full server navigations.
  it("selecting a tab updates the URL with pushState and does not navigate", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    render(<TodoFilters active="all" />);

    const notPrevented = fireEvent.click(screen.getByRole("link", { name: "Active" }));

    expect(notPrevented).toBe(false); // default (a full navigation) was prevented
    expect(pushState).toHaveBeenCalledWith(null, "", "/todos?status=active");
  });

  it("does not push a duplicate history entry for the tab already showing", () => {
    window.history.replaceState(null, "", "/todos?status=active");
    const pushState = vi.spyOn(window.history, "pushState");
    render(<TodoFilters active="active" />);

    fireEvent.click(screen.getByRole("link", { name: "Active" }));

    expect(pushState).not.toHaveBeenCalled();
  });

  it("leaves modified clicks alone so a tab can still open in a new tab", () => {
    const pushState = vi.spyOn(window.history, "pushState");
    render(<TodoFilters active="all" />);

    const notPrevented = fireEvent.click(screen.getByRole("link", { name: "Completed" }), {
      ctrlKey: true,
    });

    expect(notPrevented).toBe(true);
    expect(pushState).not.toHaveBeenCalled();
  });

  it("marks only the active tab as current", () => {
    render(<TodoFilters active="completed" />);

    expect(screen.getByRole("link", { name: "Completed" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "All" })).not.toHaveAttribute("aria-current");
  });

  it("applies active styling only to the active filter", () => {
    render(<TodoFilters active="active" />);

    expect(screen.getByRole("link", { name: "Active" })).toHaveClass(
      "bg-accent-soft",
      "text-accent-text"
    );
    expect(screen.getByRole("link", { name: "All" })).not.toHaveClass("bg-accent-soft");
    expect(screen.getByRole("link", { name: "Completed" })).not.toHaveClass("bg-accent-soft");
  });

  it("marks All as active by default styling when active is 'all'", () => {
    render(<TodoFilters active="all" />);

    expect(screen.getByRole("link", { name: "All" })).toHaveClass("bg-accent-soft");
    expect(screen.getByRole("link", { name: "Active" })).not.toHaveClass("bg-accent-soft");
    expect(screen.getByRole("link", { name: "Completed" })).not.toHaveClass("bg-accent-soft");
  });

  it("links to the right status query params", () => {
    render(<TodoFilters active="all" />);

    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/todos");
    expect(screen.getByRole("link", { name: "Active" })).toHaveAttribute(
      "href",
      "/todos?status=active"
    );
    expect(screen.getByRole("link", { name: "Completed" })).toHaveAttribute(
      "href",
      "/todos?status=completed"
    );
  });
});
