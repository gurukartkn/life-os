"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logBoundaryError } from "@/lib/errors";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logBoundaryError("App route", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <AlertTriangle className="size-6 text-ink-muted" />
      <p className="text-body text-ink-muted">Something went wrong.</p>
      <Button type="button" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
