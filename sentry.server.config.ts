import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry/options";

// Server-side init, loaded by instrumentation.ts (ADR-008).
Sentry.init(sentryOptions());
