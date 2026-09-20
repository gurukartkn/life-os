import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry/options";

// Browser-side init (ADR-008): unhandled errors and promise rejections.
// Tracing is off, so this hook records nothing; it is exported because the SDK asks for it.
Sentry.init(sentryOptions());

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
