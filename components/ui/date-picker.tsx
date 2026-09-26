"use client"

import * as React from "react"
import { CalendarDays, X } from "lucide-react"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// The one date field (docs/05-design-system.md, v2 Amendment §D; component sheet
// "Date picker"): an input-styled field — calendar icon, the date as "Mon 21 Sep
// 2026", an optional status adornment (the task form's Overdue pill) and an x that
// clears it — which opens the Calendar with Clear / Today underneath. The value is
// the same "YYYY-MM-DD" string the `date` columns use; "" means no date. It is built
// from local-time parts (date-fns parseISO/format), so a picked day never shifts
// across midnight/UTC. Past dates are selectable on purpose — a task can be created
// overdue.
export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "No date",
  adornment,
  className,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  // Accessible name of the field, e.g. "Due date".
  label: string
  placeholder?: string
  // Shown inside the field after the date, e.g. an Overdue pill.
  adornment?: React.ReactNode
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const selected = value ? parseISO(value) : undefined
  const display = selected ? format(selected, "EEE d MMM yyyy") : null

  function choose(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          "flex h-10 w-full min-w-0 items-center gap-2 rounded-md border border-border-strong bg-surface-100 pr-1 pl-3 transition-colors has-[button[data-popup-open]]:border-accent has-[button[data-popup-open]]:ring-3 has-[button[data-popup-open]]:ring-accent/30 has-focus-visible:border-accent has-focus-visible:ring-3 has-focus-visible:ring-accent/30",
          disabled && "pointer-events-none bg-surface-200 text-ink-muted",
          className
        )}
      >
        <PopoverTrigger
          disabled={disabled}
          aria-label={display ? `${label}, ${display}` : label}
          className={cn(
            "flex h-full min-w-0 flex-1 items-center gap-2 text-left text-base outline-none md:text-sm",
            display ? "text-ink" : "text-ink-faint"
          )}
        >
          <CalendarDays className="size-4 shrink-0 text-ink-muted" strokeWidth={1.75} />
          <span className="truncate">{display ?? placeholder}</span>
        </PopoverTrigger>
        {display && (
          <div className="flex shrink-0 items-center gap-1">
            {adornment}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Clear ${label.toLowerCase()}`}
              disabled={disabled}
              onClick={() => onChange("")}
            >
              <X />
            </Button>
          </div>
        )}
      </div>
      <PopoverContent align="start" className="w-80 gap-2">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => choose(date ? format(date, "yyyy-MM-dd") : "")}
        />
        <div className="flex items-center justify-between">
          {display ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => choose("")}>
              Clear
            </Button>
          ) : (
            <span />
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => choose(format(new Date(), "yyyy-MM-dd"))}
          >
            Today
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
