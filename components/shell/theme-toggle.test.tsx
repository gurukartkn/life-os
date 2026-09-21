import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useUIStore } from "@/stores/use-ui-store";
import { ThemeToggle } from "./theme-toggle";

describe("ThemeToggle", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.setAttribute("data-theme", "light");
    useUIStore.setState({ theme: "light" });
  });

  it("offers dark theme while light is active, and switches to it", async () => {
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(window.localStorage.getItem("life-os-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeInTheDocument();
  });

  it("switches back to light", async () => {
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    await userEvent.click(screen.getByRole("button", { name: "Switch to light theme" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("renders both label variants (CSS shows the right one) when a label class is given", () => {
    render(<ThemeToggle labelClassName="hidden md:inline" />);

    expect(screen.getByText("Dark theme")).toBeInTheDocument();
    expect(screen.getByText("Light theme")).toBeInTheDocument();
  });
});
