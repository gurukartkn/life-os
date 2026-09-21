import { beforeEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { reportError, toReportableError } from "./report";
import { logBoundaryError, logError } from "@/lib/errors";

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

const captureException = vi.mocked(Sentry.captureException);

const TITLE = "Buy milk for Ravi";

beforeEach(() => {
  captureException.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("toReportableError", () => {
  it("reduces a Postgres/PostgREST error to context + code, dropping message, details and hint", () => {
    const postgresError = {
      code: "23505",
      message: `duplicate key value violates unique constraint "tasks_title_key"`,
      details: `Key (title)=(${TITLE}) already exists.`,
      hint: `try another ${TITLE}`,
    };

    const reportable = toReportableError("createTask", postgresError);

    expect(reportable.message).toBe("createTask failed (23505)");
    expect(JSON.stringify([reportable.message, reportable.stack])).not.toContain(TITLE);
  });

  it("reduces a Supabase Auth error (an Error with a code) the same way", () => {
    const authError = Object.assign(new Error(`Invalid login for ravi@example.com`), {
      code: "invalid_credentials",
    });

    const reportable = toReportableError("login", authError);

    expect(reportable.message).toBe("login failed (invalid_credentials)");
    expect(reportable).not.toBe(authError);
  });

  it("keeps an unexpected Error (with its stack) when it has no code", () => {
    const boom = new TypeError("Cannot read properties of undefined");

    expect(toReportableError("Load tasks", boom)).toBe(boom);
  });

  it("offers nothing but the context for values with no safe text", () => {
    expect(toReportableError("Load tasks", { message: TITLE }).message).toBe("Load tasks failed");
    expect(toReportableError("Load tasks", TITLE).message).toBe("Load tasks failed");
    expect(toReportableError("Load tasks", null).message).toBe("Load tasks failed");
  });
});

describe("reportError", () => {
  it("sends the reduced error to Sentry", () => {
    reportError("createTask", { code: "23505", details: `Key (title)=(${TITLE})` });

    expect(captureException).toHaveBeenCalledTimes(1);
    expect((captureException.mock.calls[0][0] as Error).message).toBe("createTask failed (23505)");
  });
});

describe("logError", () => {
  it("logs to the console and reports", () => {
    logError("deleteTask", { code: "42501" });

    expect(console.error).toHaveBeenCalledWith("deleteTask failed:", { code: "42501" });
    expect(captureException).toHaveBeenCalledTimes(1);
  });
});

describe("logBoundaryError", () => {
  it("reports a client-side error", () => {
    logBoundaryError("App route", new Error("render failed"));

    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("does not report an error that has a digest — the server already reported it", () => {
    logBoundaryError("App route", Object.assign(new Error("An error occurred"), { digest: "123" }));

    expect(console.error).toHaveBeenCalled();
    expect(captureException).not.toHaveBeenCalled();
  });
});
