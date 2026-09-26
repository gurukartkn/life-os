"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { logBoundaryError } from "@/lib/errors";

// The load-failed state from every module's "error" board: plain message, one retry
// action, no data shown.
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logBoundaryError("App route", error);
  }, [error]);

  return (
    <EmptyState
      tone="error"
      icon={AlertTriangle}
      title="Something went wrong"
      description="Check your connection and try again."
      action={
        <Button type="button" variant="outline" onClick={reset}>
          <RotateCw strokeWidth={1.75} />
          Try again
        </Button>
      }
    />
  );
}
