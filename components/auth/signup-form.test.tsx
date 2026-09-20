import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignupForm } from "./signup-form";
import { signup } from "@/actions/auth";

vi.mock("@/actions/auth", () => ({
  signup: vi.fn(),
}));

const mockedSignup = vi.mocked(signup);

describe("SignupForm", () => {
  beforeEach(() => {
    mockedSignup.mockReset();
  });

  it("has a show/hide toggle on the password field, hidden by default", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    const password = screen.getByLabelText("Password", { selector: "input" });
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
    expect(mockedSignup).not.toHaveBeenCalled();
  });
});
