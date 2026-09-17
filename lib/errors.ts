import type { AuthError } from "@supabase/supabase-js";

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
