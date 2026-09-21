import * as Sentry from "@sentry/nextjs";

// Turns whatever was caught into something safe to send (ADR-008, limit 5).
// Provider errors — Postgres/PostgREST, Supabase Auth, Node system errors — carry a
// `code`, and their `message`/`details`/`hint` can quote row values ("Key (title)=(…)
// already exists"), so only `context + code` is kept. A real Error without a code (an
// unexpected exception) keeps its stack; its message is masked again in beforeSend.
// Anything else (plain objects, strings) has no safe text to offer.
export function toReportableError(context: string, error: unknown): Error {
  const code =
    typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
      ? error.code
      : null;

  if (code) return new Error(`${context} failed (${code})`);
  if (error instanceof Error) return error;
  return new Error(`${context} failed`);
}

export function reportError(context: string, error: unknown): void {
  Sentry.captureException(toReportableError(context, error));
}
