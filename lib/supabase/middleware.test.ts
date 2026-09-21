// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { updateSession } from "./middleware";

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));

const mockedCreateServerClient = vi.mocked(createServerClient);

function signedIn(claims: Record<string, unknown> | null) {
  const auth = {
    getClaims: vi.fn().mockResolvedValue({ data: claims ? { claims } : null, error: null }),
    getUser: vi.fn(),
  };
  mockedCreateServerClient.mockReturnValue({ auth } as never);
  return auth;
}

function request(path: string) {
  return new NextRequest(`http://localhost:3000${path}`);
}

beforeEach(() => {
  mockedCreateServerClient.mockReset();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "http://supabase.test";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
});

describe("updateSession", () => {
  it("redirects a signed-out visitor to /login", async () => {
    signedIn(null);

    const response = await updateSession(request("/tasks"));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/login");
  });

  it("lets a signed-out visitor see /login and /signup", async () => {
    signedIn(null);

    for (const path of ["/login", "/signup"]) {
      const response = await updateSession(request(path));
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("sends a signed-in user away from /login to /tasks", async () => {
    signedIn({ sub: "user-1" });

    const response = await updateSession(request("/login"));

    expect(new URL(response.headers.get("location")!).pathname).toBe("/tasks");
  });

  it("lets a signed-in user through to app routes", async () => {
    signedIn({ sub: "user-1" });

    const response = await updateSession(request("/fitness"));

    expect(response.headers.get("location")).toBeNull();
  });

  // Regression for backlog #6: the auth check on every navigation must not be a
  // network round trip to Supabase Auth.
  it("checks the session with local JWT verification, never the network getUser()", async () => {
    const auth = signedIn({ sub: "user-1" });

    await updateSession(request("/routines"));

    expect(auth.getClaims).toHaveBeenCalledTimes(1);
    expect(auth.getUser).not.toHaveBeenCalled();
  });
});
