import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // The dev-only Next.js badge covers the sidebar's account menu (bottom-left) or the
  // entity drawer's Save / Edit button (bottom-right). Errors still open the overlay.
  devIndicators: false,
  experimental: {
    // A CSV import (Stage 5b) sends up to 5,000 mapped rows to importCsv in one Server
    // Action; with notes that can pass the 1 MB default. The file itself is 2 MB at most.
    serverActions: { bodySizeLimit: "4mb" },
  },
  // Settings was split into Profile and Preferences (Phase 8.2a); old links and
  // bookmarks land on Preferences.
  async redirects() {
    return [{ source: "/settings", destination: "/preferences", permanent: true }];
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
