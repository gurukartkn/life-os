import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils";

// One input style for every text-like control (docs/05-design-system.md, v2
// Amendment §B, component sheet): 40px tall, radius-md, white fill, 1px
// border-strong border, accent border + 3px accent halo on focus, pink border when
// invalid, surface-200 fill and muted text when disabled.
const inputClassName =
  "h-10 w-full min-w-0 rounded-md border border-border-strong bg-surface-100 px-3 py-1 text-base text-ink transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink placeholder:text-ink-faint focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-surface-200 disabled:text-ink-muted aria-invalid:border-pink aria-invalid:focus-visible:ring-pink/20 md:text-sm"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputClassName, className)}
      {...props}
    />
  )
}

export { Input, inputClassName }
