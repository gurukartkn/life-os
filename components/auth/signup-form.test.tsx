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

  it("gives the confirm field its own toggle", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    const confirm = screen.getByLabelText("Confirm password", { selector: "input" });
    await user.click(screen.getByRole("button", { name: "Show confirm password" }));

    expect(confirm).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Password", { selector: "input" })).toHaveAttribute("type", "password");
  });

  it("does not submit when the passwords don't match", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText("Email"), "me@example.com");
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "sunday-ride-42");
    await user.type(screen.getByLabelText("Confirm password", { selector: "input" }), "sunday-ride-43");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    expect(await screen.findByText("Passwords don't match.")).toBeInTheDocument();
    expect(mockedSignup).not.toHaveBeenCalled();
  });

  it("submits email and password (not the confirmation) when they match", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText("Email"), "me@example.com");
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "sunday-ride-42");
    await user.type(screen.getByLabelText("Confirm password", { selector: "input" }), "sunday-ride-42");
    await user.click(screen.getByRole("button", { name: "Create account" }));

    await vi.waitFor(() => expect(mockedSignup).toHaveBeenCalledTimes(1));
    const formData = mockedSignup.mock.calls[0][1] as FormData;
    expect(formData.get("password")).toBe("sunday-ride-42");
    expect(formData.has("confirmPassword")).toBe(false);
  });
});
