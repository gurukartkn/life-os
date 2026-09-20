"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { logBoundaryError } from "@/lib/errors";
import "./globals.css";

// Last-resort boundary: it replaces the root layout when that itself fails, so it
// renders its own <html> and <body>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logBoundaryError("Global", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-svh flex-col items-center justify-center gap-3 bg-surface-050 text-center">
        <p className="text-body text-ink-muted">Something went wrong.</p>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </body>
    </html>
  );
}
