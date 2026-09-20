import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("hides the password by default", () => {
    render(<PasswordInput aria-label="Secret" />);

    expect(screen.getByLabelText("Secret")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("shows and hides the password when the toggle is pressed", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Secret" />);

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText("Secret")).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.getByLabelText("Secret")).toHaveAttribute("type", "password");
  });

  it("keeps the typed value when toggling", async () => {
    const user = userEvent.setup();
    render(<PasswordInput aria-label="Secret" />);

    await user.type(screen.getByLabelText("Secret"), "hunter22");
    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(screen.getByLabelText("Secret")).toHaveValue("hunter22");
  });

  it("does not submit the surrounding form when the toggle is pressed", async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const user = userEvent.setup();
    render(
      <form onSubmit={onSubmit}>
        <PasswordInput aria-label="Secret" />
      </form>
    );

    await user.click(screen.getByRole("button", { name: "Show password" }));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
