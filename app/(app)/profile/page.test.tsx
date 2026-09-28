import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfilePage from "./page";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/actions/auth", () => ({ logout: vi.fn() }));
vi.mock("@/actions/profile", () => ({ updateDisplayName: vi.fn() }));

function withClaims(claims: Record<string, unknown>) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims } }) },
  } as never);
}

describe("ProfilePage", () => {
  beforeEach(() => {
    withClaims({ email: "me@example.com", user_metadata: { display_name: "Guru K" } });
  });

  it("shows the initials avatar, an editable name, the read-only email and Sign out", async () => {
    render(await ProfilePage());

    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("GK")).toBeInTheDocument();
    expect(screen.getByLabelText("Display name")).toHaveValue("Guru K");
    const email = screen.getByLabelText("Email");
    expect(email).toHaveValue("me@example.com");
    expect(email).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("falls back to the email's name when no display name is set", async () => {
    withClaims({ email: "me@example.com", user_metadata: {} });
    render(await ProfilePage());

    expect(screen.getByLabelText("Display name")).toHaveValue("me");
  });
});
