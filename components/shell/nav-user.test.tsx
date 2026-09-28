import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavUser } from "./nav-user";
import { logout } from "@/actions/auth";
import { useUIStore } from "@/stores/use-ui-store";

vi.mock("@/actions/auth", () => ({ logout: vi.fn() }));

const USER = { email: "guru.karthik@example.com", displayName: "Guru Karthik" };

describe("NavUser", () => {
  beforeEach(() => {
    vi.mocked(logout).mockReset();
    useUIStore.setState({ sidebarCollapsed: false });
  });

  it("opens a menu headed by the avatar, name and email, with the three pages and Log out", async () => {
    const user = userEvent.setup();
    render(<NavUser user={USER} />);

    await user.click(screen.getByRole("button", { name: "Account menu" }));
    const menu = await screen.findByRole("menu");

    expect(menu).toHaveTextContent("GK");
    expect(menu).toHaveTextContent("Guru Karthik");
    expect(menu).toHaveTextContent("guru.karthik@example.com");
    expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("menuitem", { name: "Preferences" })).toHaveAttribute("href", "/preferences");
    expect(screen.getByRole("menuitem", { name: "Recycle Bin" })).toHaveAttribute("href", "/recycle-bin");
    expect(screen.getByRole("menuitem", { name: "Log out" })).toBeInTheDocument();
  });

  it("moves between items with the arrow keys and closes on Esc", async () => {
    const user = userEvent.setup();
    render(<NavUser user={USER} />);

    const trigger = screen.getByRole("button", { name: "Account menu" });
    trigger.focus();
    await user.keyboard("{Enter}");
    await screen.findByRole("menu");

    await waitFor(() => expect(screen.getByRole("menuitem", { name: "Profile" })).toHaveFocus());
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Preferences" })).toHaveFocus();
    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Log out" })).toHaveFocus();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });

  it("logs out straight from the menu, with no confirmation", async () => {
    const user = userEvent.setup();
    render(<NavUser user={USER} />);

    await user.click(screen.getByRole("button", { name: "Account menu" }));
    await user.click(await screen.findByRole("menuitem", { name: "Log out" }));

    await waitFor(() => expect(logout).toHaveBeenCalled());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
