import { describe, expect, it } from "vitest";
import type { Event } from "@sentry/nextjs";
import { sanitizeText, sanitizeUrl, scrubEvent } from "./scrub";

// Fake user content that must never reach a report (ADR-008).
const TASK_TITLE = "Buy milk for Ravi";
const EMAIL = "ravi.private@example.com";
const WORKOUT = "bench 82.5kg x 8";
const AMOUNT = "₹48,250.00";
const COOKIE = "sb-access-token=eyJhbGciOi.payload.signature";

function leakyEvent(): Event {
  return {
    event_id: "abc123",
    timestamp: 1789000000,
    level: "error",
    platform: "node",
    release: "sha-1",
    environment: "production",
    server_name: "host-1",
    sdk: { name: "sentry.javascript.nextjs", version: "10.0.0" },
    transaction: "GET /routines/8b3f7a52-1c2d-4e5f-9a0b-123456789abc",
    message: `Failed for ${EMAIL}`,
    user: { id: "u-1", email: EMAIL, ip_address: "203.0.113.9" },
    tags: { title: TASK_TITLE },
    extra: { title: TASK_TITLE, amount: AMOUNT, workout: WORKOUT },
    breadcrumbs: [{ category: "ui.click", message: `button "${TASK_TITLE}"` }],
    fingerprint: [TASK_TITLE],
    modules: { next: "16" },
    request: {
      url: "https://life-os.example/tasks?status=active&q=Buy%20milk#top",
      method: "POST",
      headers: { cookie: COOKIE, "user-agent": "x" },
      cookies: { session: COOKIE },
      data: `title=${TASK_TITLE}`,
      query_string: "q=Buy milk",
      env: { REMOTE_ADDR: "203.0.113.9" },
    },
    contexts: {
      runtime: { name: "node", version: "24" },
      browser: { name: "Chrome", version: "140" },
      os: { name: "Windows" },
      finance: { balance: AMOUNT } as never,
      device: { model: "private-laptop" },
    },
    exception: {
      values: [
        {
          type: "error",
          value: `duplicate key: Key (title)=(${TASK_TITLE}) already exists; "${WORKOUT}"`,
          mechanism: { type: "generic", handled: true, data: { title: TASK_TITLE } } as never,
          stacktrace: {
            frames: [
              {
                filename: "app/actions/tasks.ts",
                abs_path: "C:/secret/path/tasks.ts",
                function: "createTask",
                lineno: 32,
                colno: 5,
                in_app: true,
                context_line: `const title = "${TASK_TITLE}";`,
                pre_context: [WORKOUT],
                post_context: [AMOUNT],
                vars: { title: TASK_TITLE },
              },
            ],
          },
        },
      ],
    },
  };
}

describe("scrubEvent", () => {
  it("removes every piece of user content and identity, wherever it was", () => {
    const serialized = JSON.stringify(scrubEvent(leakyEvent()));

    for (const secret of [TASK_TITLE, EMAIL, WORKOUT, AMOUNT, "eyJhbGciOi", "203.0.113.9", "private-laptop", "secret/path", "host-1"]) {
      expect(serialized, `leaked: ${secret}`).not.toContain(secret);
    }
  });

  it("drops user, tags, extra, breadcrumbs, fingerprint, modules and request bodies", () => {
    const scrubbed = scrubEvent(leakyEvent());

    expect(scrubbed.user).toBeUndefined();
    expect(scrubbed.tags).toBeUndefined();
    expect(scrubbed.extra).toBeUndefined();
    expect(scrubbed.breadcrumbs).toBeUndefined();
    expect(scrubbed.fingerprint).toBeUndefined();
    expect(scrubbed.modules).toBeUndefined();
    expect(scrubbed.server_name).toBeUndefined();
    expect(scrubbed.request?.headers).toBeUndefined();
    expect(scrubbed.request?.cookies).toBeUndefined();
    expect(scrubbed.request?.data).toBeUndefined();
    expect(scrubbed.request?.query_string).toBeUndefined();
    expect(scrubbed.request?.env).toBeUndefined();
  });

  it("keeps what is needed to debug: error type, stack frames, release, environment", () => {
    const scrubbed = scrubEvent(leakyEvent());

    expect(scrubbed.release).toBe("sha-1");
    expect(scrubbed.environment).toBe("production");
    expect(scrubbed.level).toBe("error");
    const exception = scrubbed.exception?.values?.[0];
    expect(exception?.type).toBe("error");
    expect(exception?.mechanism).toEqual({ type: "generic", handled: true });
    expect(exception?.stacktrace?.frames).toEqual([
      { filename: "app/actions/tasks.ts", function: "createTask", lineno: 32, colno: 5, in_app: true },
    ]);
  });

  it("keeps only the browser, os and runtime contexts", () => {
    const scrubbed = scrubEvent(leakyEvent());

    expect(Object.keys(scrubbed.contexts ?? {}).sort()).toEqual(["browser", "os", "runtime"]);
  });

  it("reduces the request to method and a query-free, id-free path", () => {
    const scrubbed = scrubEvent(leakyEvent());

    expect(scrubbed.request).toEqual({ url: "https://life-os.example/tasks", method: "POST" });
    expect(scrubbed.transaction).toBe("GET /routines/:id");
  });

  it("does not add fields that were absent", () => {
    const scrubbed = scrubEvent({ event_id: "x", level: "error" });

    expect(Object.keys(scrubbed).sort()).toEqual(["event_id", "level"]);
  });
});

describe("sanitizeText", () => {
  it("masks Postgres key details", () => {
    expect(sanitizeText("Key (title)=(Buy milk) already exists")).toBe("Key (…)=(…) already exists");
  });

  it("masks emails, tokens and quoted strings", () => {
    expect(sanitizeText(`bad ${EMAIL}`)).toBe("bad [email]");
    expect(sanitizeText("jwt eyJhbGci.eyJzdWIi.c2ln here")).toBe("jwt [token] here");
    expect(sanitizeText(`reading 'title' and "Buy milk"`)).toBe(`reading '…' and "…"`);
  });

  it("truncates long text", () => {
    expect(sanitizeText("x".repeat(1000))).toHaveLength(300);
  });

  it("passes undefined through", () => {
    expect(sanitizeText(undefined)).toBeUndefined();
  });
});

describe("sanitizeUrl", () => {
  it("strips query, fragment and row ids", () => {
    expect(sanitizeUrl("https://a.test/routines/8b3f7a52-1c2d-4e5f-9a0b-123456789abc?x=1#y")).toBe(
      "https://a.test/routines/:id"
    );
  });

  it("handles a relative path", () => {
    expect(sanitizeUrl("/tasks?status=active")).toBe("/tasks");
  });
});
