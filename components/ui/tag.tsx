import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils";

// Status pill / tag (component sheet "Tag / status pill"): 22px tall, radius-sm,
// 12px medium text, an optional 12px leading icon. The tone carries status —
// pink overdue, blue due/in progress, teal done, violet active, neutral otherwise.
// `dashed` is the outlined "Provisional"-style marker.
const tagVariants = cva(
  "inline-flex h-[22px] shrink-0 items-center gap-1 rounded-sm px-2 text-caption font-medium whitespace-nowrap [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        neutral: "bg-surface-200 text-ink-muted",
        pink: "bg-pink-soft text-pink-ink",
        blue: "bg-blue-soft text-blue-ink",
        teal: "bg-teal-soft text-teal-ink",
        violet: "bg-accent-soft text-accent-text",
        dashed: "border border-dashed border-border-strong text-ink-muted",
      },
    },
    defaultVariants: { tone: "neutral" },
  }
)

function Tag({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof tagVariants>) {
  return <span data-slot="tag" className={cn(tagVariants({ tone }), className)} {...props} />
}

export { Tag, tagVariants }
