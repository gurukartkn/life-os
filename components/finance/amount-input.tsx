import * as React from "react";
import { cn } from "@/lib/utils";

// The ₹ amount field (5b · Finance sheets): the input style with a muted ₹ in front.
// Typed as text with a decimal keypad, so "1,240.50" is kept exactly as typed and
// turned into paise by the schema, never by a float.
export function AmountInput({
  className,
  suffix,
  ...props
}: React.ComponentProps<"input"> & { suffix?: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex h-10 w-full min-w-0 items-center gap-2 rounded-md border border-border-strong bg-surface-100 px-3 transition-colors has-aria-invalid:border-pink has-focus-visible:border-accent has-focus-visible:ring-3 has-focus-visible:ring-accent/30",
        className
      )}
    >
      <span aria-hidden="true" className="text-body text-ink-muted">
        ₹
      </span>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        className="h-full min-w-0 flex-1 bg-transparent text-base text-ink tabular-nums outline-none placeholder:text-ink-faint md:text-sm"
        {...props}
      />
      {suffix}
    </div>
  );
}
