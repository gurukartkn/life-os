"use client";

import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/use-ui-store";

// One-icon theme toggle: the collapsed sidebar's footer, and top-right on the
// screens without a sidebar (log in, sign up). A 40px bordered icon button showing
// the theme it switches to. The icon swaps with the `dark:` variant (keyed to <html
// data-theme>), so it is right on first paint; the store supplies the accessible name.
export function ThemeToggle({ className }: { className?: string }) {
  const theme = useUIStore((state) => state.theme);
  const toggleTheme = useUIStore((state) => state.toggleTheme);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-md border border-border-strong bg-surface-100 text-ink outline-none transition-colors hover:bg-surface-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        className
      )}
    >
      <Moon className="size-4 dark:hidden" strokeWidth={1.75} />
      <Sun className="hidden size-4 dark:block" strokeWidth={1.75} />
    </button>
  );
}
