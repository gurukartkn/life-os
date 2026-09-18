"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
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
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={isPending}
        aria-label="Export data"
        className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-body text-ink-muted outline-none transition-colors hover:bg-surface-200 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50"
      >
        <Download className="size-5 shrink-0" />
        <span className="hidden md:inline">{isPending ? "Exporting…" : "Export data"}</span>
      </button>
      {error && <span className="hidden px-2.5 text-caption text-pink-ink md:block">{error}</span>}
    </div>
  );
}
