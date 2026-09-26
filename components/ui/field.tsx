import * as React from "react"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils";

// Messages under a form field (component sheet "Input"): helper text in muted
// caption, and validation errors in pink-ink with a 14px alert icon.
function FieldHint({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-caption text-ink-muted", className)} {...props} />
}

function FieldError({ className, children, ...props }: React.ComponentProps<"p">) {
  if (!children) return null
  return (
    <p className={cn("flex items-start gap-1 text-caption text-pink-ink", className)} {...props}>
      <AlertCircle className="mt-px size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

// Label, control and messages stacked 6px apart.
function Field({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("flex min-w-0 flex-col gap-1.5", className)} {...props} />
}

export { Field, FieldHint, FieldError }
