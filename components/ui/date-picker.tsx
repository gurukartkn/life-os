"use client"

import * as React from "react"
import { CalendarDays } from "lucide-react"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { inputClassName } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// The one date field (docs/05-design-system.md, v2 Amendment §D): an input-styled
// trigger that opens the Calendar. The value is the same "YYYY-MM-DD" string the
// `date` columns use; "" means no date. It is built from local-time parts
// (date-fns parseISO/format), so a picked day never shifts across midnight/UTC.
// Past dates are selectable on purpose — a task can be created overdue.
export function DatePicker({
  value,
  onChange,
  label,
  placeholder = "No date",
  className,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  // Accessible name of the field, e.g. "Due date".
  label: string
  placeholder?: string
  className?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const selected = value ? parseISO(value) : undefined
  const display = selected ? format(selected, "MMM d, yyyy") : null

  function choose(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        aria-label={display ? `${label}, ${display}` : label}
        className={cn(
          inputClassName,
          "flex items-center gap-2 text-left md:text-sm",
          !display && "text-ink-faint",
          className
        )}
      >
        <CalendarDays className="size-4 shrink-0 text-ink-muted" />
        <span className="truncate">{display ?? placeholder}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto gap-2">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => choose(date ? format(date, "yyyy-MM-dd") : "")}
        />
        {display && (
          <button
            type="button"
            onClick={() => choose("")}
            className="self-start rounded-md px-2 py-1 text-body text-accent-text outline-none transition-colors hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-ring"
          >
            Clear date
          </button>
        )}
      </PopoverContent>
    </Popover>
  )
}
