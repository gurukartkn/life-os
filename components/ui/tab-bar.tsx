import * as React from "react"
import { cn } from "@/lib/utils";

// Underline tabs (component sheet "Tabs"): 44px tall, fixed minimum width so
// switching never shifts the row, a 2px accent underline and accent-text semibold
// label on the active tab, and an optional tabular count pill. The tabs themselves
// are links or buttons supplied by the caller, styled with `tabClassName`; the caller
// sets the matching role (a group of filter links, or a tablist of tabs).
function TabBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-end gap-5 border-b border-border", className)}
      {...props}
    />
  )
}

function tabClassName(active: boolean, className?: string) {
  return cn(
    "-mb-px inline-flex h-11 min-w-[88px] items-center justify-center gap-2 border-b-2 px-1 text-body outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    active
      ? "border-accent font-semibold text-accent-text"
      : "border-transparent font-medium text-ink-muted hover:text-ink",
    className
  )
}

function TabCount({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-surface-200 px-[7px] text-caption leading-[18px] font-medium text-ink-muted tabular-nums">
      {children}
    </span>
  )
}

export { TabBar, TabCount, tabClassName }
