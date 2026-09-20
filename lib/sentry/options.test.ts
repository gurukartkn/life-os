import { afterEach, describe, expect, it, vi } from "vitest";
import { sentryOptions } from "./options";

afterEach(() => vi.unstubAllEnvs());

describe("sentryOptions", () => {
  it("is off without a DSN", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "");
    vi.stubEnv("NODE_ENV", "production");

    expect(sentryOptions().enabled).toBe(false);
  });

  it("is off outside production even with a DSN", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");
    vi.stubEnv("NODE_ENV", "development");

    expect(sentryOptions().enabled).toBe(false);
  });

  it("is on only in production with a DSN", () => {
    vi.stubEnv("NEXT_PUBLIC_SENTRY_DSN", "https://key@o1.ingest.sentry.io/1");
    vi.stubEnv("NODE_ENV", "production");

    expect(sentryOptions().enabled).toBe(true);
  });

  it("keeps identity, breadcrumbs, tracing and replay out (ADR-008 limits 3, 6, 7)", () => {
    const options = sentryOptions() as Record<string, unknown>;

    expect(options.sendDefaultPii).toBe(false);
    expect(options.maxBreadcrumbs).toBe(0);
    expect((options.beforeBreadcrumb as () => null)()).toBeNull();
    expect(options).not.toHaveProperty("tracesSampleRate");
    expect(options).not.toHaveProperty("tracesSampler");
    expect(options).not.toHaveProperty("replaysSessionSampleRate");
    expect(options).not.toHaveProperty("replaysOnErrorSampleRate");
    expect(options).not.toHaveProperty("profilesSampleRate");
  });

  it("removes the breadcrumb and session integrations, keeps the rest", () => {
    const defaults = ["Breadcrumbs", "BrowserSession", "GlobalHandlers", "HttpContext"].map(
      (name) => ({ name })
    );

    const kept = sentryOptions().integrations(defaults).map((integration) => integration.name);

    expect(kept).toEqual(["GlobalHandlers", "HttpContext"]);
  });

  it("scrubs events before they are sent", () => {
    const event = { event_id: "x", user: { email: "a@b.co" } };

    expect(sentryOptions().beforeSend(event)).toEqual({ event_id: "x" });
  });
});
