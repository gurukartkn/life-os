"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { logError } from "@/lib/errors";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError("Root", error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-surface-050 text-center">
      <AlertTriangle className="size-6 text-ink-muted" />
      <p className="text-body text-ink-muted">Something went wrong.</p>
      <button
        type="button"
        onClick={reset}
        className="text-button-text flex h-[38px] items-center gap-1.5 rounded-md bg-accent px-4.5 text-white outline-none transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
      >
        Try again
      </button>
    </div>
  );
}
