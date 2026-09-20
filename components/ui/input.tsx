import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils";

// One input style for every text-like control (docs/05-design-system.md, v2
// Amendment §B): 38px tall, radius-md, white fill, 1px border-strong border,
// accent border + ring on focus, pink border when invalid.
const inputClassName =
  "h-[38px] w-full min-w-0 rounded-md border border-border-strong bg-surface-100 px-3 py-1 text-base text-ink transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink placeholder:text-ink-faint focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-pink aria-invalid:ring-pink/20 md:text-sm"

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
