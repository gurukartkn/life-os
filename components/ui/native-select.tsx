import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// Select field (5b · Finance filters and sheets): the input style — 40px, radius-md,
// white fill, strong border, accent ring on focus — with a chevron on the right. It is
// the browser's own <select>, so the keyboard, screen readers and phones all get their
// native picker. `size="sm"` is the 36px in-table variant.
function NativeSelect({
  className,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & { size?: "default" | "sm" }) {
  return (
    <div className={cn("relative flex min-w-0", className)}>
      <select
        data-slot="native-select"
        className={cn(
          "w-full min-w-0 appearance-none truncate rounded-md border border-border-strong bg-surface-100 pr-9 pl-3 text-base text-ink transition-colors outline-none focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:bg-surface-200 disabled:text-ink-muted aria-invalid:border-pink md:text-sm",
          size === "sm" ? "h-9" : "h-10"
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
        strokeWidth={1.75}
      />
    </div>
  )
}

export { NativeSelect }
