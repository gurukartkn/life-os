import type { AuthError } from "@supabase/supabase-js";
import { reportError } from "@/lib/sentry/report";

// The one place every Server Action and Server Component funnels unexpected
// errors through. Always logs to the console; in production it also reports to
// Sentry (ADR-008), reduced to what is safe to send — see lib/sentry/report.ts.
export function logError(context: string, error: unknown): void {
  console.error(`${context} failed:`, error);
  reportError(context, error);
}

// For error boundaries (error.tsx). An error that carries a `digest` happened on the
// server and has already been reported by onRequestError, so only client-side
// errors are reported from here.
export function logBoundaryError(context: string, error: Error & { digest?: string }): void {
  console.error(`${context} failed:`, error);
  if (!error.digest) reportError(context, error);
}

// Maps Supabase/Postgres errors to short, plain user-facing messages
// (docs/04-backend-architecture.md §7) — raw provider error text never reaches the UI.
export function mapAuthError(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "That email and password don't match.";
    case "user_already_exists":
    case "email_exists":
      return "An account with that email already exists.";
    case "weak_password":
      return "Choose a stronger password (at least 8 characters).";
    case "email_not_confirmed":
      return "Confirm your email before logging in.";
    case "over_email_send_rate_limit":
      return "Too many attempts. Wait a moment and try again.";
    default:
      return "Something went wrong. Try again.";
  }
}
