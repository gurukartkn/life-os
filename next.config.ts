import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  experimental: {
    // A CSV import (Stage 5b) sends up to 5,000 mapped rows to importCsv in one Server
    // Action; with notes that can pass the 1 MB default. The file itself is 2 MB at most.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

// Sentry error tracking (ADR-008). Source maps are uploaded at build time only when
// SENTRY_AUTH_TOKEN is present (set it in Vercel's Production environment, never in
// the repo); without it the build works and reports just have minified frames.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: true,
  },
});
