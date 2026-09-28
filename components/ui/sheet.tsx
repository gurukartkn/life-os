"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Side panel on the same Base UI dialog as the modal: the surface-overlay scrim, a
// surface-100 panel with the float shadow. `side="responsive"` is a bottom sheet
// on phones and a right-hand panel from 640px (the entity drawer uses it).
function Sheet(props: SheetPrimitive.Root.Props) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger(props: SheetPrimitive.Trigger.Props) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose(props: SheetPrimitive.Close.Props) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

const RIGHT =
  "inset-y-0 right-0 h-full w-full max-w-[440px] border-l data-ending-style:translate-x-10 data-starting-style:translate-x-10"
const BOTTOM =
  "inset-x-0 bottom-0 max-h-[85svh] rounded-t-lg border-t data-ending-style:translate-y-10 data-starting-style:translate-y-10"
// A full-width bottom sheet under 640px, the right-hand panel from sm up.
const RESPONSIVE = cn(
  BOTTOM,
  "sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:h-full sm:max-h-none sm:w-full sm:max-w-[440px] sm:rounded-none sm:border-t-0 sm:border-l sm:data-ending-style:translate-x-10 sm:data-ending-style:translate-y-0 sm:data-starting-style:translate-x-10 sm:data-starting-style:translate-y-0"
)
const SIDES = { right: RIGHT, bottom: BOTTOM, responsive: RESPONSIVE }

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: keyof typeof SIDES
  showCloseButton?: boolean
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Backdrop
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-surface-overlay transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none"
      />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        data-side={side}
        className={cn(
          "fixed z-50 flex flex-col border-border bg-surface-100 text-ink shadow-float outline-none transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none",
          SIDES[side],
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close
            data-slot="sheet-close"
            render={<Button variant="ghost" size="icon-sm" className="absolute top-4 right-4" aria-label="Close" />}
          >
            <X />
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Popup>
    </SheetPrimitive.Portal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sheet-header" className={cn("flex flex-col gap-0.5 p-6 pb-4", className)} {...props} />
}

function SheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="sheet-body" className={cn("min-h-0 flex-1 overflow-y-auto px-6 pb-6", className)} {...props} />
  )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex items-center justify-end gap-2 border-t border-border px-6 py-4", className)}
      {...props}
    />
  )
}

function SheetTitle({ className, ...props }: SheetPrimitive.Title.Props) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-dialog-title text-ink", className)} {...props} />
}

function SheetDescription({ className, ...props }: SheetPrimitive.Description.Props) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-body-sm text-ink-muted", className)}
      {...props}
    />
  )
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription }
