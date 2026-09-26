"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// Segmented control (Exercises type filter, exercise form Type, routine frequency…):
// a surface-200 track with 3px inset; the chosen segment is a white, strong-bordered
// chip in semibold ink, the others muted. Each option is a toggle button
// (aria-pressed), and the group carries the accessible label.
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "md",
  className,
}: {
  value: T;
  options: readonly { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("inline-flex w-fit shrink-0 items-center gap-0.5 rounded-md bg-surface-200 p-[3px]", className)}
    >
      {options.map((option) => {
        const pressed = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-sm border px-3 text-[13px] whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3.5 [&_svg]:shrink-0",
              size === "sm" ? "h-6" : "h-[30px]",
              pressed
                ? "border-border-strong bg-surface-100 font-semibold text-ink"
                : "border-transparent bg-transparent font-medium text-ink-muted hover:text-ink"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
