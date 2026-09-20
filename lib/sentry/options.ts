import { scrubEvent } from "@/lib/sentry/scrub";

// Options shared by the browser and server SDK inits (ADR-008). Reports are sent
// only from a production build that has a DSN — set NEXT_PUBLIC_SENTRY_DSN in
// Vercel's Production environment only, so previews and local runs send nothing.
//
// Deliberately NOT configured: tracesSampleRate (no performance tracing),
// profiling, Session Replay, and local-variable capture.

// Integrations that would add data the ADR keeps out: breadcrumbs (console, fetch,
// XHR and DOM text — Supabase URLs can carry filter values) and session tracking.
const DISABLED_INTEGRATIONS = new Set(["Breadcrumbs", "BrowserSession"]);

export function sentryOptions() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  return {
    dsn,
    enabled: Boolean(dsn) && process.env.NODE_ENV === "production",
    sendDefaultPii: false,
    maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    beforeSend: scrubEvent,
    integrations: <T extends { name: string }>(defaults: T[]) =>
      defaults.filter((integration) => !DISABLED_INTEGRATIONS.has(integration.name)),
  };
}
