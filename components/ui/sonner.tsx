"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleAlert, CircleCheck, Info, Loader2, TriangleAlert } from "lucide-react"
import { useUIStore } from "@/stores/use-ui-store"

// The app's one toast region (mounted in components/shell/app-shell.tsx; call it
// through lib/toast.ts). Top-centre: the bottom is where the entity drawer's and
// the phone bottom sheet's Save / Delete buttons sit. On phones Sonner stretches it
// full width, and `mobileOffset` starts it below the top nav bar so it never covers
// the nav. Colours come from the design tokens; the theme follows the UI store.
function Toaster(props: ToasterProps) {
  const theme = useUIStore((state) => state.theme)

  return (
    <Sonner
      theme={theme}
      position="top-center"
      offset={16}
      mobileOffset={{ top: 72, left: 16, right: 16 }}
      className="toaster group"
      icons={{
        success: <CircleCheck className="size-4 text-teal-ink" strokeWidth={1.75} />,
        info: <Info className="size-4 text-blue-ink" strokeWidth={1.75} />,
        warning: <TriangleAlert className="size-4 text-pink-ink" strokeWidth={1.75} />,
        error: <CircleAlert className="size-4 text-pink-ink" strokeWidth={1.75} />,
        loading: <Loader2 className="size-4 animate-spin" strokeWidth={1.75} />,
      }}
      style={
        {
          "--normal-bg": "var(--surface-100)",
          "--normal-text": "var(--ink)",
          "--normal-border": "var(--border-strong)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "font-sans rounded-md!",
          title: "text-body font-medium",
          description: "text-body-sm text-ink-muted",
          actionButton: "bg-accent! text-accent-ink! font-medium! rounded-sm!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
