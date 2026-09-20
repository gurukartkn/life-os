import * as React from "react"
import { cn } from "@/lib/utils";

function Tag({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="tag"
      className={cn(
        "inline-flex items-center rounded-full bg-surface-200 px-2.5 py-0.5 text-caption text-ink-muted",
        className
      )}
      {...props}
    />
  )
}

export { Tag }
