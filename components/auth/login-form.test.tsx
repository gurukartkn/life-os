import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "./login-form";
import { login } from "@/actions/auth";

vi.mock("@/actions/auth", () => ({
  login: vi.fn(),
}));

const mockedLogin = vi.mocked(login);

describe("LoginForm", () => {
  beforeEach(() => {
    mockedLogin.mockReset();
  });

  it("has a show/hide toggle on the password field, hidden by default", async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const password = screen.getByLabelText("Password", { selector: "input" });
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
  });

  it("does not submit when the toggle is pressed, and still submits the typed password", async () => {
    mockedLogin.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText("Email"), "me@example.com");
    await user.type(screen.getByLabelText("Password", { selector: "input" }), "hunter2222");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(mockedLogin).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => expect(mockedLogin).toHaveBeenCalled());
    expect(mockedLogin.mock.calls[0][1].get("password")).toBe("hunter2222");
  });
});
