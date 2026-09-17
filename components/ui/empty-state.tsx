import * as React from "react"
import { cn } from "cn"

function EmptyState({
  icon: Icon,
  title,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-center gap-3 py-12 text-center",
        className
      )}
    >
      <Icon className="size-6 text-ink-muted" />
      <p className="text-body text-ink-muted">{title}</p>
      {action}
    </div>
  )
}

export { EmptyState }
