"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/errors";

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError("Root", error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-surface-050 text-center">
      <AlertTriangle className="size-6 text-ink-muted" />
      <p className="text-body text-ink-muted">Something went wrong.</p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
