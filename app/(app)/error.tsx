"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { logError } from "@/lib/errors";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError("App route", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
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
