"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/use-ui-store";

// Light / Dark segmented control (sidebar footer, Settings › Appearance). Same look
// as SegmentedControl, but which segment looks pressed follows the `dark:` variant —
// keyed to <html data-theme> — so it is right on first paint; the store supplies
// aria-pressed once synced.
const SEGMENT =
  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-sm border px-3 text-[13px] whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5 [&_svg]:shrink-0";
const PRESSED = "border-border-strong bg-surface-100 font-semibold text-ink";
const UNPRESSED = "border-transparent bg-transparent font-medium text-ink-muted hover:text-ink";

export function ThemeSwitch({ size = "sm", className }: { size?: "sm" | "md"; className?: string }) {
  const theme = useUIStore((state) => state.theme);
  const setTheme = useUIStore((state) => state.setTheme);
  const height = size === "sm" ? "h-6" : "h-[30px]";

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn("flex shrink-0 items-center gap-0.5 rounded-md bg-surface-200 p-[3px]", className)}
    >
      <button
        type="button"
        aria-pressed={theme === "light"}
        onClick={() => setTheme("light")}
        className={cn(SEGMENT, height, PRESSED, "dark:border-transparent dark:bg-transparent dark:font-medium dark:text-ink-muted dark:hover:text-ink")}
      >
        <Sun strokeWidth={1.75} />
        Light
      </button>
      <button
        type="button"
        aria-pressed={theme === "dark"}
        onClick={() => setTheme("dark")}
        className={cn(SEGMENT, height, UNPRESSED, "dark:border-border-strong dark:bg-surface-100 dark:font-semibold dark:text-ink")}
      >
        <Moon strokeWidth={1.75} />
        Dark
      </button>
    </div>
  );
}
