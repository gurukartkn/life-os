"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportUserData } from "@/actions/export";
import { SIDEBAR_ITEM_BASE, SIDEBAR_LABEL } from "@/components/shell/sidebar-styles";

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
        title="Export data"
        className={cn(
          SIDEBAR_ITEM_BASE,
          "w-full text-ink-muted hover:bg-surface-200 hover:text-ink disabled:pointer-events-none disabled:opacity-50"
        )}
      >
        <Download className="size-5 shrink-0" />
        <span className={SIDEBAR_LABEL}>{isPending ? "Exporting…" : "Export data"}</span>
      </button>
      {error && (
        <span className="hidden px-2.5 text-caption text-pink-ink md:block md:sidebar-collapsed:hidden">
          {error}
        </span>
      )}
    </div>
  );
}
