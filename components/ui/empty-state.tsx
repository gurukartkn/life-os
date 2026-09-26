import * as React from "react"
import { cn } from "@/lib/utils";

// Empty and error states (component sheet "Empty state"; each module's "empty" and
// "error" boards): a card holding a 56px round icon disc, a heading-weight title,
// one muted sentence and at most one action. `tone="error"` tints the disc pink —
// the load-failed state, whose action is a secondary "Try again".
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "neutral",
  className,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  title: string
  description?: string
  action?: React.ReactNode
  tone?: "neutral" | "error"
  className?: string
}) {
  return (
    <div
      data-slot="empty-state"
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "flex flex-col items-center gap-3 rounded-lg border border-border bg-surface-100 px-6 py-8 text-center",
        className
      )}
    >
      <div
        className={cn(
          "flex size-14 items-center justify-center rounded-full",
          tone === "error" ? "bg-pink-soft text-pink-ink" : "bg-surface-200 text-ink-muted"
        )}
      >
        <Icon className="size-6" strokeWidth={1.75} />
      </div>
      <p className="text-heading text-ink">{title}</p>
      {description && <p className="max-w-[360px] text-body text-ink-muted">{description}</p>}
      {action}
    </div>
  )
}

export { EmptyState }
