import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TodoFilters } from "./todo-filters";

describe("TodoFilters", () => {
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
