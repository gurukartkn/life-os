import { beforeEach, describe, expect, it, vi } from "vitest";
import { login, logout, signup } from "@/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { makeSupabaseMock, type SupabaseMock } from "@/lib/test/supabase-mock";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

const mockedCreateClient = vi.mocked(createClient);

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

let supabase: SupabaseMock;

beforeEach(async () => {
  vi.clearAllMocks();
  const { redirect } = await import("next/navigation");
  vi.mocked(redirect).mockClear();
  supabase = makeSupabaseMock();
  mockedCreateClient.mockResolvedValue(supabase as never);
});

describe("login", () => {
  it("returns a validation error and never calls Supabase when the password is empty", async () => {
    const result = await login({ success: false }, formData({ email: "user@example.com", password: "" }));

    expect(result).toEqual({ success: false, error: "Enter your password." });
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("returns a validation error for an invalid email", async () => {
    const result = await login({ success: false }, formData({ email: "not-an-email", password: "secretpw" }));

    expect(result).toEqual({ success: false, error: "Enter a valid email address." });
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in and redirects to /tasks on success", async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: null });
    const { redirect } = await import("next/navigation");

    await login({ success: false }, formData({ email: "user@example.com", password: "secretpw" }));

    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secretpw",
    });
    expect(redirect).toHaveBeenCalledWith("/tasks");
  });

  it("maps a Supabase auth error to a friendly message", async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials" } });

    const result = await login({ success: false }, formData({ email: "user@example.com", password: "wrongpw" }));

    expect(result).toEqual({ success: false, error: "That email and password don't match." });
  });
});

describe("signup", () => {
  it("returns a validation error and never calls Supabase when the password is too short", async () => {
    const result = await signup({ success: false }, formData({ email: "user@example.com", password: "short" }));

    expect(result).toEqual({ success: false, error: "Password must be at least 8 characters." });
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it("redirects to /tasks when signup returns an immediate session", async () => {
    supabase.auth.signUp.mockResolvedValue({ data: { session: { access_token: "tok" } }, error: null });
    const { redirect } = await import("next/navigation");

    await signup({ success: false }, formData({ email: "user@example.com", password: "secretpw" }));

    expect(supabase.auth.signUp).toHaveBeenCalledWith({ email: "user@example.com", password: "secretpw" });
    expect(redirect).toHaveBeenCalledWith("/tasks");
  });

  it("returns a confirmation message when signup has no immediate session", async () => {
    supabase.auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
    const { redirect } = await import("next/navigation");

    const result = await signup({ success: false }, formData({ email: "user@example.com", password: "secretpw" }));

    expect(redirect).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      data: "Check your email to confirm your account, then log in.",
    });
  });

  it("maps a Supabase auth error to a friendly message", async () => {
    supabase.auth.signUp.mockResolvedValue({ data: { session: null }, error: { code: "email_exists" } });

    const result = await signup({ success: false }, formData({ email: "user@example.com", password: "secretpw" }));

    expect(result).toEqual({ success: false, error: "An account with that email already exists." });
  });
});

describe("logout", () => {
  it("signs out and redirects to /login", async () => {
    const { redirect } = await import("next/navigation");

    await logout();

    expect(supabase.auth.signOut).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
