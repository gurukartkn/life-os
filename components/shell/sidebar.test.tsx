import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "./sidebar";
import { useUIStore } from "@/stores/use-ui-store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/fitness",
}));

describe("Sidebar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-sidebar");
    useUIStore.setState({ sidebarCollapsed: false });
  });

  it("starts expanded with a collapse toggle", () => {
    render(<Sidebar userEmail="me@example.com" />);

    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", "app-sidebar");
  });

  it("collapses and expands, updating the document and storage", async () => {
    const user = userEvent.setup();
    render(<Sidebar userEmail="me@example.com" />);

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    expect(document.documentElement).toHaveAttribute("data-sidebar", "collapsed");
    expect(window.localStorage.getItem("life-os-sidebar")).toBe("collapsed");
    const expand = screen.getByRole("button", { name: "Expand sidebar" });
    expect(expand).toHaveAttribute("aria-expanded", "false");

    await user.click(expand);

    expect(document.documentElement).not.toHaveAttribute("data-sidebar");
    expect(window.localStorage.getItem("life-os-sidebar")).toBe("expanded");
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
  });

  it("lists every section, reachable by name when collapsed (labels are CSS-hidden)", () => {
    render(<Sidebar userEmail="me@example.com" />);

    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute("href", "/tasks");
    expect(screen.getByRole("link", { name: "Fitness" })).toHaveAttribute("href", "/fitness");
    expect(screen.getByRole("link", { name: "Routines" })).toHaveAttribute("href", "/routines");
    expect(screen.getByRole("link", { name: "Goals" })).toHaveAttribute("href", "/goals");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
  });

  it("highlights the current section", () => {
    render(<Sidebar userEmail="me@example.com" />);

    const fitness = screen.getByRole("link", { name: "Fitness" });
    expect(fitness.className).toContain("bg-accent-soft");
    expect(fitness).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Tasks" }).className).not.toContain("bg-accent-soft");
  });

  it("offers the Light/Dark switch and the one-icon toggle for the collapsed rail", () => {
    render(<Sidebar userEmail="me@example.com" />);

    expect(screen.getByRole("button", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dark" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /switch to (dark|light) theme/i })).toBeInTheDocument();
  });

  it("shows the account's initials and email in the footer", () => {
    render(<Sidebar userEmail="guru.karthik@example.com" />);

    expect(screen.getByText("GK")).toBeInTheDocument();
    expect(screen.getByText("guru.karthik@example.com")).toBeInTheDocument();
  });
});
