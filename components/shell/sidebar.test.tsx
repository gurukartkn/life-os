import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "./sidebar";
import { useUIStore } from "@/stores/use-ui-store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/fitness",
}));
vi.mock("@/actions/auth", () => ({ logout: vi.fn() }));

const USER = { email: "guru.karthik@example.com", displayName: "Guru Karthik" };

describe("Sidebar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-sidebar");
    useUIStore.setState({ sidebarCollapsed: false });
  });

  it("starts expanded with a collapse toggle", () => {
    render(<Sidebar user={USER} />);

    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", "app-sidebar");
  });

  it("collapses and expands, updating the document and storage", async () => {
    const user = userEvent.setup();
    render(<Sidebar user={USER} />);

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
    render(<Sidebar user={USER} />);

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAccessibleName("Today");
    expect(links[0]).toHaveAttribute("href", "/today");
    expect(links[0]).toHaveAttribute("title", "Today");
    expect(screen.getByRole("link", { name: "Tasks" })).toHaveAttribute("href", "/tasks");
    expect(screen.getByRole("link", { name: "Fitness" })).toHaveAttribute("href", "/fitness");
    expect(screen.getByRole("link", { name: "Routines" })).toHaveAttribute("href", "/routines");
    expect(screen.getByRole("link", { name: "Goals" })).toHaveAttribute("href", "/goals");
    expect(screen.getByRole("link", { name: "Finance" })).toHaveAttribute("href", "/finance");
  });

  it("highlights the current section", () => {
    render(<Sidebar user={USER} />);

    const fitness = screen.getByRole("link", { name: "Fitness" });
    expect(fitness.className).toContain("bg-accent-soft");
    expect(fitness).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Tasks" }).className).not.toContain("bg-accent-soft");
  });

  // Phase 8.2a: Settings and the theme switch moved into the account menu's pages.
  it("has no Settings item and no theme controls", () => {
    render(<Sidebar user={USER} />);

    expect(screen.queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Light" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /switch to (dark|light) theme/i })).not.toBeInTheDocument();
  });

  it("shows the account's initials, name and email on the account menu trigger", () => {
    render(<Sidebar user={USER} />);

    const trigger = screen.getByRole("button", { name: "Account menu" });
    expect(trigger).toHaveTextContent("GK");
    expect(trigger).toHaveTextContent("Guru Karthik");
    expect(trigger).toHaveTextContent("guru.karthik@example.com");
  });
});
