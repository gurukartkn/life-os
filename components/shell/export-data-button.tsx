"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportUserData } from "@/actions/export";

function downloadJson(data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `life-os-export-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

// Settings › Data: one button, no options.
export function ExportDataButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleExport() {
    setError(null);
    startTransition(async () => {
      const result = await exportUserData();
      if (!result.success || !result.data) {
        setError(result.error ?? "Couldn't export your data. Try again.");
        return;
      }
      downloadJson(result.data);
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <Button type="button" variant="outline" onClick={handleExport} disabled={isPending}>
        <Download strokeWidth={1.75} />
        {isPending ? "Exporting…" : "Export JSON"}
      </Button>
      {error && <span className="text-caption text-pink-ink">{error}</span>}
    </div>
  );
}
