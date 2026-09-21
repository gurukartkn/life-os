import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sidebar } from "./sidebar";
import { useUIStore } from "@/stores/use-ui-store";

vi.mock("next/navigation", () => ({
  usePathname: () => "/fitness",
}));
vi.mock("@/actions/auth", () => ({ logout: vi.fn() }));
vi.mock("@/actions/export", () => ({ exportUserData: vi.fn() }));

describe("Sidebar", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-sidebar");
    useUIStore.setState({ sidebarCollapsed: false });
  });

  it("starts expanded with a collapse toggle", () => {
    render(<Sidebar userEmail="me@example.com" hasExportableData />);

    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", "app-sidebar");
  });

  it("collapses and expands, updating the document and storage", async () => {
    const user = userEvent.setup();
    render(<Sidebar userEmail="me@example.com" hasExportableData />);

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

  it("keeps every item reachable by name when collapsed (labels are CSS-hidden)", () => {
    render(<Sidebar userEmail="me@example.com" hasExportableData />);

    expect(screen.getByRole("link", { name: "Today" })).toHaveAttribute("href", "/todos");
    expect(screen.getByRole("link", { name: "Fitness" })).toHaveAttribute("href", "/fitness");
    expect(screen.getByRole("link", { name: "Routines" })).toHaveAttribute("href", "/routines");
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export data" })).toBeInTheDocument();
  });

  it("highlights the current section", () => {
    render(<Sidebar userEmail="me@example.com" hasExportableData />);

    expect(screen.getByRole("link", { name: "Fitness" }).className).toContain("bg-accent-soft");
    expect(screen.getByRole("link", { name: "Today" }).className).not.toContain("bg-accent-soft");
  });

  // Regression for backlog #19.
  it("hides Export data when the account has nothing to export", () => {
    render(<Sidebar userEmail="me@example.com" hasExportableData={false} />);

    expect(screen.queryByRole("button", { name: "Export data" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("shows Export data once there is data", () => {
    render(<Sidebar userEmail="me@example.com" hasExportableData />);

    expect(screen.getByRole("button", { name: "Export data" })).toBeInTheDocument();
  });

  it("offers the theme toggle", () => {
    render(<Sidebar userEmail="me@example.com" hasExportableData />);

    expect(screen.getByRole("button", { name: /switch to (dark|light) theme/i })).toBeInTheDocument();
  });
});
