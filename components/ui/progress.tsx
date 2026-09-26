"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cn } from "@/lib/utils";

// Progress bar (component sheet): 8px surface-200 track, full-round. The fill is
// ink by default; `tone` switches it to a status colour — teal done, blue routines
// in progress, pink over budget.
const INDICATOR_TONES = {
  ink: "bg-ink",
  teal: "bg-teal",
  blue: "bg-blue",
  pink: "bg-pink",
  violet: "bg-accent",
} as const

type ProgressTone = keyof typeof INDICATOR_TONES

function Progress({
  className,
  children,
  value,
  tone = "ink",
  ...props
}: ProgressPrimitive.Root.Props & { tone?: ProgressTone }) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("flex flex-wrap gap-1.5", className)}
      {...props}
    >
      {children}
      <ProgressTrack>
        <ProgressIndicator className={INDICATOR_TONES[tone]} />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      className={cn(
        "relative flex h-2 w-full items-center overflow-hidden rounded-full bg-surface-200",
        className
      )}
      data-slot="progress-track"
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn("h-full rounded-full bg-ink transition-all", className)}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn("text-body-sm text-ink", className)}
      data-slot="progress-label"
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn(
        "ml-auto text-body-sm text-ink-muted tabular-nums",
        className
      )}
      data-slot="progress-value"
      {...props}
    />
  )
}

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
}
