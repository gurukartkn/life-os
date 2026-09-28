import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PreferencesPage from "./page";
import { createClient } from "@/lib/supabase/server";
import { userHasData } from "@/lib/has-data";
import { getUserTimezone } from "@/lib/queries/user-settings";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/has-data", () => ({ userHasData: vi.fn() }));
vi.mock("@/lib/queries/user-settings", () => ({ getUserTimezone: vi.fn() }));
vi.mock("@/actions/profile", () => ({ updateTimezone: vi.fn() }));
vi.mock("@/actions/export", () => ({ exportUserData: vi.fn() }));

const mockedUserHasData = vi.mocked(userHasData);

beforeEach(() => {
  vi.mocked(createClient).mockResolvedValue({} as never);
  vi.mocked(getUserTimezone).mockResolvedValue("Asia/Kolkata");
});

// Everything the old Settings page held besides the account (now on /profile).
describe("PreferencesPage", () => {
  it("shows the theme switch, the saved timezone and Export for an account with data", async () => {
    mockedUserHasData.mockResolvedValue(true);
    render(await PreferencesPage());

    expect(screen.getByRole("heading", { name: "Preferences" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Light" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dark" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Timezone" })).toHaveValue("Asia/Kolkata");
    expect(screen.getByRole("button", { name: "Export JSON" })).toBeInTheDocument();
  });

  it("offers UTC even where the runtime's zone list leaves it out", async () => {
    mockedUserHasData.mockResolvedValue(false);
    vi.mocked(getUserTimezone).mockResolvedValue("UTC");
    render(await PreferencesPage());

    expect(screen.getByRole("combobox", { name: "Timezone" })).toHaveValue("UTC");
  });

  // Backlog #19: no disabled button and no empty card when there is nothing to export.
  it("leaves the Data card out entirely when there is nothing to export", async () => {
    mockedUserHasData.mockResolvedValue(false);
    render(await PreferencesPage());

    expect(screen.queryByRole("heading", { name: "Data" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Export JSON" })).not.toBeInTheDocument();
  });
});
