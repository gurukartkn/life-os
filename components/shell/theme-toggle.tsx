"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/use-ui-store";

// Icon and label swap with the `dark:` variant (keyed to <html data-theme>), so
// they are right on first paint; the store only supplies the accessible name.
export function ThemeToggle({
  labelClassName,
  className,
}: {
  // When set, a text label is shown next to the icon with these classes.
  labelClassName?: string;
  className?: string;
}) {
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "flex items-center gap-2 rounded-md px-2.5 py-2 text-body text-ink-muted outline-none transition-colors hover:bg-surface-200 hover:text-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        className
      )}
    >
      <Moon className="size-5 shrink-0 dark:hidden" />
      <Sun className="hidden size-5 shrink-0 dark:block" />
      {labelClassName !== undefined && (
        <span className={labelClassName}>
          <span className="dark:hidden">Dark theme</span>
          <span className="hidden dark:inline">Light theme</span>
        </span>
      )}
    </button>
  );
}
