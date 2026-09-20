import * as Sentry from "@sentry/nextjs";

export async function register() {
  // proxy.ts runs on the Node runtime in Next 16, so there is no edge runtime to configure.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
}

// Reports unhandled errors from Server Components, Server Actions and the proxy (ADR-008).
export const onRequestError = Sentry.captureRequestError;
