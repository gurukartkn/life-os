import * as React from "react"
import { cn } from "@/lib/utils";

// Page header (shell boards): page title, an optional one-line muted context
// underneath, and the page's primary action(s) right-aligned on the same row —
// "Add task", "New workout" and "New routine" all sit in this slot.
function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-5 flex items-center justify-between gap-2", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <h1 className="text-page-title text-ink">{title}</h1>
        {description && <p className="text-body-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}

export { PageHeader }
