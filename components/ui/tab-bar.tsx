import * as React from "react"
import { cn } from "@/lib/utils";

// Underline tabs (component sheet "Tabs"): 44px tall, fixed minimum width so
// switching never shifts the row, a 2px accent underline and accent-text semibold
// label on the active tab, and an optional tabular count pill. The tabs themselves
// are links or buttons supplied by the caller, styled with `tabClassName`; the caller
// sets the matching role (a group of filter links, or a tablist of tabs).
// A row wider than the screen scrolls sideways by touch or trackpad, with no scrollbar
// chrome; tabs never shrink, so the row scrolls rather than squeezes. overflow-y is
// pinned to hidden (with overflow-x auto it would compute to auto and show a vertical
// scrollbar on any 1px overhang), so nothing may hang below the row: the baseline is an
// inset shadow, which each tab's own 2px bottom border paints over when active.
function TabBar({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex items-end gap-5 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--color-border)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0",
        className
      )}
      {...props}
    />
  )
}

function tabClassName(active: boolean, className?: string) {
  return cn(
    "inline-flex h-11 min-w-[88px] items-center justify-center gap-2 border-b-2 px-1 rounded-t-sm text-body outline-none transition-colors focus-visible:inset-ring-2 focus-visible:inset-ring-ring",
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
