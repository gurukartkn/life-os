"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Modal form (Tasks/Goals/Exercises "form" boards): a surface-overlay scrim, and a
// 480px white panel 36px from the top with radius-lg, 24px padding and the float
// shadow. Title 18/24 semibold with an optional muted line under it, a ghost close
// button top-right, and a footer row (Cancel ghost, primary on the right) under a
// divider.
function Dialog(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="dialog-overlay"
        className="fixed inset-0 z-50 bg-surface-overlay duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
      />
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          "fixed top-9 left-1/2 z-50 flex max-h-[calc(100svh-4.5rem)] w-[calc(100%-2rem)] max-w-[480px] -translate-x-1/2 flex-col gap-4 overflow-y-auto rounded-lg bg-surface-100 p-6 text-ink shadow-float outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function DialogHeader({
  title,
  description,
}: {
  title: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex flex-col gap-0.5">
        <DialogPrimitive.Title className="text-dialog-title text-ink">{title}</DialogPrimitive.Title>
        {description && (
          <DialogPrimitive.Description className="text-body-sm text-ink-muted">
            {description}
          </DialogPrimitive.Description>
        )}
      </div>
      <DialogPrimitive.Close render={<Button variant="ghost" size="icon-sm" aria-label="Close" />}>
        <X />
      </DialogPrimitive.Close>
    </div>
  )
}

function DialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <>
      <div className="h-px w-full shrink-0 bg-border" />
      <div
        data-slot="dialog-footer"
        className={cn("flex items-center justify-end gap-2", className)}
        {...props}
      />
    </>
  )
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter }
