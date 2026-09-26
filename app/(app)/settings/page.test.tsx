import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SettingsPage from "./page";
import { createClient } from "@/lib/supabase/server";
import { userHasData } from "@/lib/has-data";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/has-data", () => ({ userHasData: vi.fn() }));
vi.mock("@/actions/auth", () => ({ logout: vi.fn() }));
vi.mock("@/actions/export", () => ({ exportUserData: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);
const mockedUserHasData = vi.mocked(userHasData);

beforeEach(() => {
  mockedCreateClient.mockResolvedValue({
    auth: { getClaims: vi.fn().mockResolvedValue({ data: { claims: { email: "me@example.com" } } }) },
  } as never);
});

describe("SettingsPage", () => {
  it("shows Appearance, Data and Account for an account with data", async () => {
    mockedUserHasData.mockResolvedValue(true);
    render(await SettingsPage());

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Export JSON" })).toBeInTheDocument();
    expect(screen.getByText("me@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  // Backlog #19: no disabled button and no empty card when there is nothing to export.
  it("leaves the Data card out entirely when there is nothing to export", async () => {
    mockedUserHasData.mockResolvedValue(false);
    render(await SettingsPage());

    expect(screen.queryByRole("heading", { name: "Data" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export JSON" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
